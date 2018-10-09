let SVG_URL = "http://www.w3.org/2000/svg";
let REFS = {
    title: null,
    map: null
};
REFS.map = $('#map');

// 0==CLOSEST PATH, 1==GRAHAM_SCAN, 2==FIND_THE_WAY
let MODE = 0;

let canAdd = true;
let originalPoints = [
    {x: -13.0, y: 0.5},
    {x: -10.5, y: -11.5},
    {x: -10.0, y: 9.0},
    {x: -4.5,  y: -2.0},
    {x: -1.0,  y: 8.5},
    {x: 0.5,   y: 6.0},
    {x: 0.5,   y: -12},
    {x: 2.0,   y: 12.5},
    {x: 3.5,   y: 11.0},
    {x: 5.5,   y: 3.0},
    {x: 5.5,   y: -7.0},
    {x: 5.0,   y: 11.5},
    {x: 6.5,   y: 3.2},
    {x: 7.0,   y: -10.0},
    {x: 9.0,   y: -5.0},
    {x: 11.5,   y: -4.0},
];
let points = [];
let pointsCount = 0;

$(document).ready(function() {
    $('#map-container').on('click', function(event) {
        CreateClickPoint(event);
    });
});

function CreateClickPoint(ev) {
    if (MODE !== 0 || !canAdd) { return; }

    let clickX = ev.pageX - 15;
    let clickY = ev.pageY - 100;

    AddPoint(clickX, clickY);
}
function PresetPoints(ev) {
    ev.stopPropagation();

    // Get SVG map size
    let map = REFS.map[0].getBoundingClientRect();
    let posX = map.width/ 30;
    let posY = map.height/ 30;

    // Reset points and convert coordinates no px
    DeleteAllPoints();
    for (let i = 0; i < originalPoints.length; i++) {
        let pointX = (originalPoints[i].x + 15) * posX;
        let pointY = map.height - ((originalPoints[i].y + 15) * posY);

        AddPoint(pointX, pointY);
    }
}
function AddPoint(x, y) {
    let roundedX = parseFloat(x.toFixed(1));
    let roundedY = parseFloat(y.toFixed(1));
    let point = {
        id: `point-${pointsCount}`,
        x: roundedX,
        y: roundedY
    };
    points.push(point);
    DrawCircle(roundedX, roundedY);
    pointsCount++;
}
function DrawCircle(posX, posY) {
    let newPoint = document.createElementNS(SVG_URL, 'circle');
        newPoint.setAttributeNS(null, 'r', 3);
        newPoint.setAttributeNS(null, 'cx', posX);
        newPoint.setAttributeNS(null, 'cy', posY);

    $(newPoint).addClass('point');
    $(newPoint).attr('id', `point-${pointsCount}`);
    newPoint.addEventListener('mouseover', function() {
        console.log($(newPoint).attr('id'));
        console.log($(newPoint).attr('cx'));
        console.log($(newPoint).attr('cy'));
    });

    $('#map').append(newPoint);;
}

function FindClosestPair() {
    if (points.length === 0) { return; }

    // If there are any highlighted points
    REFS.map.children('.active').removeClass('active');

    // Order by X (resolve ties by Y)
    let orderedPoints = SortArrayByXandY(points);
    let deltaObj = DivideAndConquer(0, orderedPoints.length);

    $(`#${deltaObj.id1}`).addClass('active');
    $(`#${deltaObj.id2}`).addClass('active');
}
function DivideAndConquer(start, end) {
    let deltaObj;

    if (end - start <= 3) {
        // 2 or 3 points = BRUTE FORCE
        if (end - start === 2) {
            let a = points[start];
            let b = points[end - 1];

            return Dist(a, b);
        }
        else {
            let a = points[start];
            let b = points[start + 1];
            let c = points[end - 1];

            let ab = Dist(a, b);
            let ac = Dist(a, c);
            let bc = Dist(b, c);

            let dmin = Math.min(ab.dist, ac.dist, bc.dist);

            if (dmin === ab.dist) { return ab; }
            else if (dmin === ac.dist) { return ac; }
            else { return bc; }
        }
    } else {
        // Divide into smaller arrays
        // and gets the smallest distance among them
        let m = parseInt((start + end) / 2);

        let dminL = DivideAndConquer(start, m);
        let dminR = DivideAndConquer(m, end);

        if (dminL.dist < dminR.dist) { deltaObj = dminL; }
        else { deltaObj = dminR; }

        // Check the middle section
        // and compares it with the previous dmin
        let mediumX = (points[m-1].x + points[m].x)/2;

        let pointsLeft = [];
        for (let i = start; i < m; i++) {
            if (points[i].x > mediumX - deltaObj.dist) {
                pointsLeft.push(points[i]);
            }
        }
        let pointsRight = [];
        for (let i = m; i < end; i++) {
            if (points[i].x < mediumX + deltaObj.dist) {
                pointsRight.push(points[i]);
            }
        }

        for (let i = 0; i < pointsLeft.length; i++) {
            for (let j = 0; j < pointsRight.length; j++) {
                let distMiddle = Dist(pointsLeft[i], pointsRight[j]);
                if (distMiddle.dist < deltaObj.dist) {
                    deltaObj = distMiddle;
                }
            }
        }

        return deltaObj;
    }
}

function GrahamScan() {
    if (points.length === 0) { return; }
    let convexHull = [];

    // 3 or less points = no need to/can't find the hull
    if (points.length <= 3) {
        return points;
    }

    // Create a copy of the array and find the point
    // with the smaller y
    let restOfPoints = points;
    let smallestY = points[0];
    let indexSmallestY = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].y == smallestY.y) {
            if (points[i].x < smallestY.x) {
                smallestY = points[i];
                indexSmallestY = i;
            }
        }
        else if (points[i].y < smallestY.y) {
            smallestY = points[i];
            indexSmallestY = i;
        }
    }

    // Removes that point from the new array
    restOfPoints.splice(indexSmallestY, 1);

    // Sets a 'graham angle' for each point
    // The new array is ordered by this angle afterwards
    for (let i = 0; i < restOfPoints.length; i++) {
        // Get a new coord for the point based on the pivot
        let tempX = restOfPoints[i].x - smallestY.x;
        let tempY = restOfPoints[i].y - smallestY.y;
        restOfPoints[i].grahamAngle = GetGrahamAngle(tempX, tempY);
    }
    restOfPoints.sort(function(a, b) {
        return a.grahamAngle - b.grahamAngle;
    });

    // Build the convex hull
    convexHull.push(smallestY);
    convexHull.push(restOfPoints[0]);
    for (let i = 1; i < restOfPoints.length; i++) {
        let ccw = CrossProduct(convexHull[convexHull.length - 2],
                                convexHull[convexHull.length - 1],
                                restOfPoints[i]);

        if (ccw === 0) {
            convexHull.pop();
            convexHull.push(restOfPoints[i]);
        } else if (ccw > 0) {
            convexHull.push(restOfPoints[i]);
        } else {
            do {
                convexHull.pop();
                ccw = CrossProduct(convexHull[convexHull.length - 2],
                                    convexHull[convexHull.length - 1],
                                    restOfPoints[i]);
            } while(ccw <= 0 && convexHull.length > 2);

            convexHull.push(restOfPoints[i]);
        }
    }

    return convexHull;
}

function SortArrayByXandY(arr) {
    arr.sort(function(a, b) {
        return (a.x - b.x === 0) ? a.y - b.y : a.x - b.x;
    });
    return arr;
}
function SortArrayByYandX(arr) {
    arr.sort(function(a, b) {
        return (a.y - b.y === 0) ? a.x - b.x : a.y - b.y;
    });
    return arr;
}
function Dist(p1, p2) {
    let dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

    let distObj = {
        id1: p1.id,
        id2: p2.id,
        dist: dist,
    }

    return distObj;
}
function GetGrahamAngle(x, y) {
    if (y === 0) {
        return 0;
    } else if (x > 0) {
        return Math.atan(y / x);
    } else if (x < 0) {
        return Math.atan(-x / y) + Math.PI/2;
    } else {
        return Math.PI/2;
    }
}
function CrossProduct(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

function DeleteAllPoints() {
    points = [];
    REFS.map.empty();
    pointsCount = 0;
}
