import * as _ from 'lodash';
import * as fs from 'fs';

import {
    AvailableRayDirections,
    Input,
    Limits,
    Output,
    Point,
    Polygon,
    Ray,
    RayDirection,
} from './types';

const isInAnyPolygon = ({x, y}: Point, polygons: Polygon[]): boolean =>
    polygons.some(({vertices}) =>
        vertices.reduce((result, {x: vertexX, y: vertexY}, index) => {
            let j: number;
            if (index === 0) {
                j = vertices.length - 1;
            } else {
                j = index - 1;
            }

            if (
                (vertexY < y && y <= vertices[j].y || vertices[j].y < y && y <= vertexY) &&
                (x > (vertices[j].x - vertexX) * (y - vertexY) / (vertices[j].y - vertexY) + vertexX)
            ) {
                return !result;
            } else {
                return result;
            }
        }, false));

const calculatePointFromDirection = (point: Point, direction: RayDirection, limits: Limits): Point => {
    const {
        x,
        y,
    } = point;

    switch (direction) {
        case RayDirection.Up:
            if (y + 1 <= limits.yMax) {
                return {
                    x,
                    y: y + 1,
                };
            }
            break;

        case RayDirection.Right:
            if (x + 1 <= limits.xMax) {
                return {
                    x: x + 1,
                    y,
                };
            }
            break;

        case RayDirection.Down:
            if (y - 1 >= limits.yMin) {
                return {
                    x,
                    y: y - 1,
                };
            }
            break;

        case RayDirection.Left:
            if (x - 1 >= limits.xMin) {
                return {
                    x: x - 1,
                    y,
                };
            }
            break;
    }
};

const createRay = (startPoint: Point, currentRayDirection: RayDirection, polygons: Polygon[], isSecondary = false): Ray => {
    const directionPriority: RayDirection[] = [];
    const maxDirections = AvailableRayDirections.length;
    AvailableRayDirections.forEach(() => {
        directionPriority.push(currentRayDirection);

        if (!counterclockwise) {
            currentRayDirection = (currentRayDirection + 1) % maxDirections;
        } else {
            currentRayDirection = (currentRayDirection - 1) < 0 ? maxDirections - 1 : currentRayDirection - 1;
        }
    });

    return {
        path: [startPoint],
        directionPriority,
        isSecondary,
        isStopped: isInAnyPolygon(startPoint, polygons),
    };
};

const pathIncludesPoint = (point: Point, path: Point[]) => path.some((p) => _.isEqual(p, point));

const countNextStep = (ray: Ray, polygons: Polygon[], limits: Limits): boolean => {
    const {
        directionPriority,
        path,
        isStopped,
        isSecondary,
    } = ray;
    const head = path[path.length - 1];

    if (isStopped) {
        return !isSecondary;
    }

    if (!directionPriority.some((direction) => {
        const newPoint = calculatePointFromDirection(head, direction, limits);
        if (!newPoint) {
            return false;
        }

        if (!pathIncludesPoint(newPoint, path) && !isInAnyPolygon(newPoint, polygons)) {
            path.push(newPoint);
            return true;
        } else {
            return false;
        }
    })) {
        const newPoint = path[path.findIndex((point) => _.isEqual(point, head)) - 1];

        if (!newPoint) {
            if (isSecondary) {
                ray.isStopped = true;
                return false;
            } else {
                return true;
            }
        }

        path.push(newPoint);
    }

    return false;
};

const checkConnected = (rays: Ray[], connections: number[][]): boolean => {
    rays.forEach((rayI, i) => {
        rays.forEach((rayJ, j) => {
            if (i !== j) {
                const rayHead = rayI.path[rayI.path.length - 1];

                if (rayJ.path.some((p) => _.isEqual(rayHead, p)) && !connections[i].includes(j)) {
                    connections[i].push(j);
                    connections[j].push(i);
                }
            }
        });
    });

    let usedRays = [0];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < usedRays.length; i++) {
        const rayIndex = usedRays[i];

        usedRays = _.uniq([
            ...usedRays,
            ...connections[rayIndex],
        ]);
    }

    return usedRays.includes(0) && usedRays.includes(1);
};

const prepareOutput = (rays: Ray[], connections: number[][], start: Point, finish: Point): Output => {
    let usedRays = [0];
    const tree: Record<number, {
        parent: number,
    }> = {};

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < usedRays.length; i++) {
        const rayIndex = usedRays[i];
        tree[rayIndex] = {
            parent: usedRays.find((ray) => ray !== rayIndex && connections[rayIndex].includes(ray)),
        };

        usedRays = _.uniq([
            ...usedRays,
            ...connections[rayIndex],
        ]);
    }

    const rayPath: number[] = [];
    let currentRay = 1;
    while (currentRay !== 0) {
        rayPath.unshift(currentRay);
        currentRay = tree[currentRay].parent;
    }
    rayPath.unshift(0);

    const resultPath: Point[] = [];
    const intersectionPoints: Point[] = [start];
    let intersectionPoint = intersectionPoints[0];
    rayPath.forEach((ray, index) => {
        const currentRayPath = rays[ray].path;
        const nextRay = rayPath[index + 1];

        let nextIntersectionPointIndex: number;

        const rayStartIndex = currentRayPath.findIndex((point) => _.isEqual(point, intersectionPoint));
        if (nextRay) {
            nextIntersectionPointIndex = currentRayPath.findIndex((point) => pathIncludesPoint(point, rays[nextRay].path));
            intersectionPoint = currentRayPath[nextIntersectionPointIndex];
            intersectionPoints.push(intersectionPoint);
        } else {
            nextIntersectionPointIndex = 0;
        }

        if (rayStartIndex < nextIntersectionPointIndex) {
            for (let i = rayStartIndex; i < nextIntersectionPointIndex; i++) {
                resultPath.push(currentRayPath[i]);
            }
        } else {
            for (let i = rayStartIndex; i >= nextIntersectionPointIndex; i--) {
                resultPath.push(currentRayPath[i]);
            }
        }
    });

    const output: Output = [];
    resultPath.forEach(({x, y}, index) => {
        if (index > 0) {
            output.push({
                x1: resultPath[index - 1].x,
                y1: resultPath[index - 1].y,
                x2: x,
                y2: y,
            });
            output.push({
                cx: intersectionPoint.x,
                cy: intersectionPoint.y,
            });
        }
    });
    intersectionPoints.forEach(({x, y}) => {
        output.push({
            cx: x,
            cy: y,
        });
    });

    return output;
};

(() => {
    const {
        start,
        finish,
        polygons,
    }: Input = JSON.parse(fs.readFileSync('./input.json').toString());

    const limits: Limits = {
        xMax: finish.x + 2,
        xMin: start.x - 2,
        yMax: finish.y + 2,
        yMin: start.y - 2,
    };

    const rays = [
        createRay(start, RayDirection.Up, polygons),
        createRay(finish, RayDirection.Down, polygons),
        createRay({x: start.x, y: finish.y}, RayDirection.Right,  polygons, true),
        createRay({x: finish.x, y: start.y}, RayDirection.Left,  polygons, true),
    ];

    const connections = rays.map((ray, index) => [index]);

    while (!checkConnected(rays, connections)) {
        if (rays.reduce((isError, ray) =>
            countNextStep(ray, polygons, limits), false)
        ) {
            process.exit(1);
        }
    }

    fs.writeFileSync('./output.json', JSON.stringify(prepareOutput(rays, connections, start, finish)));
})();
