import inside from '@turf/inside';
import calcBbox from '@turf/bbox';
import isPointOnLine from '@turf/boolean-point-on-line';
import { getGeom, getType } from '@turf/invariant';

/**
 * Boolean-within returns true if the first geometry is completely within the second geometry.
 * The interiors of both geometries must intersect and, the interior and boundary of the primary (geometry a)
 * must not intersect the exterior of the secondary (geometry b).
 * Boolean-within returns the exact opposite result of the `@turf/boolean-contains`.
 *
 * @name booleanWithin
 * @param {Geometry|Feature<any>} feature1 GeoJSON Feature or Geometry
 * @param {Geometry|Feature<any>} feature2 GeoJSON Feature or Geometry
 * @returns {boolean} true/false
 * @example
 * const line = turf.lineString([[1, 1], [1, 2], [1, 3], [1, 4]]);
 * const point = turf.point([1, 2]);
 *
 * turf.booleanWithin(point, line);
 * //=true
 */
function booleanWithin(feature1, feature2) {
    var type1 = getType(feature1);
    var type2 = getType(feature2);
    var geom1 = getGeom(feature1);
    var geom2 = getGeom(feature2);

    switch (type1) {
    case 'Point':
        switch (type2) {
        case 'MultiPoint':
            return isPointInMultiPoint(geom1, geom2);
        case 'LineString':
            return isPointOnLine(geom1, geom2, true);
        case 'Polygon':
            return inside(geom1, geom2, true);
        default:
            throw new Error('feature2 ' + type2 + ' geometry not supported');
        }
    case 'MultiPoint':
        switch (type2) {
        case 'MultiPoint':
            return isMultiPointInMultiPoint(geom1, geom2);
        case 'LineString':
            return isMultiPointOnLine(geom1, geom2);
        case 'Polygon':
            return isMultiPointInPoly(geom1, geom2);
        default:
            throw new Error('feature2 ' + type2 + ' geometry not supported');
        }
    case 'LineString':
        switch (type2) {
        case 'LineString':
            return isLineOnLine(geom1, geom2);
        case 'Polygon':
            return isLineInPoly(geom1, geom2);
        default:
            throw new Error('feature2 ' + type2 + ' geometry not supported');
        }
    case 'Polygon':
        switch (type2) {
        case 'Polygon':
            return isPolyInPoly(geom1, geom2);
        default:
            throw new Error('feature2 ' + type2 + ' geometry not supported');
        }
    default:
        throw new Error('feature1 ' + type1 + ' geometry not supported');
    }
}

function isPointInMultiPoint(point, multiPoint) {
    var i;
    var output = false;
    for (i = 0; i < multiPoint.coordinates.length; i++) {
        if (compareCoords(multiPoint.coordinates[i], point.coordinates)) {
            output = true;
            break;
        }
    }
    return output;
}

function isMultiPointInMultiPoint(multiPoint1, multiPoint2) {
    for (var i = 0; i < multiPoint1.coordinates.length; i++) {
        var anyMatch = false;
        for (var i2 = 0; i2 < multiPoint2.coordinates.length; i2++) {
            if (compareCoords(multiPoint1.coordinates[i], multiPoint2.coordinates[i2])) {
                anyMatch = true;
            }
        }
        if (!anyMatch) {
            return false;
        }
    }
    return true;
}

function isMultiPointOnLine(multiPoint, lineString) {
    var foundInsidePoint = false;

    for (var i = 0; i < multiPoint.coordinates.length; i++) {
        if (!isPointOnLine(multiPoint.coordinates[i], lineString)) {
            return false;
        }
        if (!foundInsidePoint) {
            foundInsidePoint = isPointOnLine(multiPoint.coordinates[i], lineString, true);
        }
    }
    return foundInsidePoint;
}

function isMultiPointInPoly(multiPoint, polygon) {
    var output = true;
    var oneInside = false;
    for (var i = 0; i < multiPoint.coordinates.length; i++) {
        var isInside = inside(multiPoint.coordinates[1], polygon);
        if (!isInside) {
            output = false;
            break;
        }
        if (!oneInside) {
            isInside = inside(multiPoint.coordinates[1], polygon, true);
        }
    }
    return output && isInside;
}

function isLineOnLine(lineString1, lineString2) {
    for (var i = 0; i < lineString1.coordinates.length; i++) {
        if (!isPointOnLine(lineString1.coordinates[i], lineString2)) {
            return false;
        }
    }
    return true;
}

function isLineInPoly(linestring, polygon) {
    var polyBbox = calcBbox(polygon);
    var lineBbox = calcBbox(linestring);
    if (!doBBoxOverlap(polyBbox, lineBbox)) {
        return false;
    }
    var foundInsidePoint = false;

    for (var i = 0; i < linestring.coordinates.length - 1; i++) {
        if (!inside(linestring.coordinates[i], polygon)) {
            return false;
        }
        if (!foundInsidePoint) {
            foundInsidePoint = inside(linestring.coordinates[i], polygon, true);
        }
        if (!foundInsidePoint) {
            var midpoint = getMidpoint(linestring.coordinates[i], linestring.coordinates[i + 1]);
            foundInsidePoint = inside(midpoint, polygon, true);

        }
    }
    return foundInsidePoint;
}

/**
 * Is Polygon2 in Polygon1
 * Only takes into account outer rings
 *
 * @private
 * @param {Geometry|Feature<Polygon>} feature1 Polygon1
 * @param {Geometry|Feature<Polygon>} feature2 Polygon2
 * @returns {boolean} true/false
 */
function isPolyInPoly(feature1, feature2) {
    var poly1Bbox = calcBbox(feature1);
    var poly2Bbox = calcBbox(feature2);
    if (!doBBoxOverlap(poly2Bbox, poly1Bbox)) {
        return false;
    }
    for (var i = 0; i < feature1.coordinates[0].length; i++) {
        if (!inside(feature1.coordinates[0][i], feature2)) {
            return false;
        }
    }
    return true;
}

function doBBoxOverlap(bbox1, bbox2) {
    if (bbox1[0] > bbox2[0]) return false;
    if (bbox1[2] < bbox2[2]) return false;
    if (bbox1[1] > bbox2[1]) return false;
    if (bbox1[3] < bbox2[3]) return false;
    return true;
}

/**
 * compareCoords
 *
 * @private
 * @param {Array<number>} pair1 point [x,y]
 * @param {Array<number>} pair2 point [x,y]
 * @returns {boolean} true/false if coord pairs match
 */
function compareCoords(pair1, pair2) {
    return pair1[0] === pair2[0] && pair1[1] === pair2[1];
}

/**
 * getMidpoint
 *
 * @private
 * @param {Array<number>} pair1 point [x,y]
 * @param {Array<number>} pair2 point [x,y]
 * @returns {Array<number>} midpoint of pair1 and pair2
 */
function getMidpoint(pair1, pair2) {
    return [(pair1[0] + pair2[0]) / 2, (pair1[1] + pair2[1]) / 2];
}

export default booleanWithin;
