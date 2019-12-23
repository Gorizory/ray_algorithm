import * as _ from 'lodash';

export enum RayDirection {
    Up,
    Right ,
    Down,
    Left ,
}

export const AvailableRayDirections = _.values(RayDirection).filter((v) => typeof v === 'number');

export type Point = {
    x: number;
    y: number;
};

export type Limits = {
    xMax: number,
    xMin: number,
    yMax: number,
    yMin: number,
};

export type Polygon = {
    x: number;
    y: number;
    vertices: Point[];
};

export type Ray = {
    directionPriority: RayDirection[],
    path: Point[],
    isSecondary: boolean,
    isStopped: boolean,
};

export type Input = {
    start: Point;
    finish: Point;
    polygons: Polygon[];
};

export type Line = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

type Circle = {
    cx: number;
    cy: number;
};

export type Output = Array<Line | Circle>;
