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

const createRay = (startPoint: Point, currentRayDirection: RayDirection): Ray => {
    const directionPriority: RayDirection[] = [];
    const maxDirections = AvailableRayDirections.length;
    AvailableRayDirections.map(() => {
        directionPriority.push(currentRayDirection);
        currentRayDirection = (currentRayDirection + 1) % maxDirections;
    });

    return {
        path: [startPoint],
        directionPriority,
    };
};

const pathIncludesPoint = (point: Point, path: Point[]) => path.some((p) => _.isEqual(p, point));

const countNextStep = (ray: Ray, polygons: Polygon[], limits: Limits): boolean => {
    const {
        directionPriority,
        path,
    } = ray;
    const head = path[path.length - 1];

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
            return true;
        }

        path.push(newPoint);
    }

    return false;
};

const checkConnected = (rays: Ray[]): boolean =>
    rays.reduce((isFinished: boolean, rayI, i) => {
        if (isFinished) {
            return true;
        }

        rays.forEach((rayJ, j) => {
            if (i !== j) {
                const rayHead = rayI.path[rayI.path.length - 1];

                if (rayJ.path.some((p) => _.isEqual(rayHead, p))) {
                    isFinished = true;
                }
            }
        });

        return isFinished;
    }, false);

const prepareOutput = (rays: Ray[]): Output => {
    const output: Output = [];
    const resultPath: Point[] = [];

    const intersectionPoint = rays[0].path.find((point) => {
        resultPath.push(point);

        return pathIncludesPoint(point, rays[1].path);
    });

    for (let i = rays[1].path.findIndex((point) => _.isEqual(point, intersectionPoint)) - 1; i >= 0; i--) {
        resultPath.push(rays[1].path[i]);
    }

    resultPath.forEach(({x, y}, index) => {
        if (index > 0) {
            output.push({
                x1: resultPath[index - 1].x,
                y1: resultPath[index - 1].y,
                x2: x,
                y2: y,
            });
            output.push({
                cx: x,
                cy: y,
            });
        }
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
        createRay(start, RayDirection.Up),
        createRay(finish, RayDirection.Down),
    ];

    while (!checkConnected(rays)) {
        if (rays.reduce((isError, ray) =>
            countNextStep(ray, polygons, limits), false)
        ) {
            process.exit(1);
        }
    }

    fs.writeFileSync('./output.json', JSON.stringify(prepareOutput(rays)));
})();
