define( [], function () {

    // Adds ctx.getTransform() - returns an SVGMatrix
    // Adds ctx.transformedPoint(x,y) - returns an SVGPoint
    var transformTracker = function ( ctx, /*initPosX, initPosY,*/ axisWidth ) {
        var svg,
            xform,
            savedTransforms = [];

        function init() {
            savedTransforms.length = 0;
            svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
            xform = svg.createSVGMatrix();

            ctx.setTransform( 1, 0, 0, 1, 0, 0 );
        }

        this.reset = init;

        // Store transformation info on ctx object
        ctx.canvasMatrix = xform;
        ctx.getScale = function () { return xform.a; };

        ctx.getTransform = function(){ return xform; };

        var save = ctx.save;
        ctx.save = function(){
            savedTransforms.push( xform.translate( 0, 0 ) );
            return save.call( ctx );
        };

        var restore = ctx.restore;
        ctx.restore = function() {
            xform = savedTransforms.pop();
            return restore.call( ctx );
        };

        var scale = ctx.scale;
        ctx.scale = function( sx, sy ) {
            xform = xform.scaleNonUniform( sx, sy );
            return scale.call( ctx, sx, sy );
        };

        var rotate = ctx.rotate;
        ctx.rotate = function( radians ) {
            xform = xform.rotate( radians * 180 / Math.PI );
            return rotate.call( ctx, radians );
        };

        var translate = ctx.translate;
        ctx.translate = function( dx, dy ) {
            xform = xform.translate( dx, dy );
            return translate.call( ctx, dx, dy );
        };

        init();

        var transform = ctx.transform;
        ctx.transform = function( a, b, c, d, e, f ) {
            var m2 = svg.createSVGMatrix();

            m2.a = a;
            m2.b = b;
            m2.c = c;
            m2.d = d;
            m2.e = e;
            m2.f = f;

            xform = xform.multiply( m2 );
            return transform.call( ctx, a, b, c, d, e, f );
        };

        var setTransform = ctx.setTransform;
        ctx.setTransform = function( a, b, c, d, e, f ){

            xform.a = a;
            xform.b = b;
            xform.c = c;
            xform.d = d;
            xform.e = e;
            xform.f = f;

            return setTransform.call( ctx, a, b, c, d, e, f );
        };

        var pt = svg.createSVGPoint();
        ctx.transformedPoint = function( x, y ){

            pt.x = x;
            pt.y = y;

            return pt.matrixTransform( xform.inverse() );
        };

        ctx.updateRefPoints = function () {

            this.canvasMatrix = xform;
            this.topLeft = ctx.transformedPoint( 0, 0 ); // Top left point of canvas
            this.bottomRight = ctx.transformedPoint( ctx.canvas.width, ctx.canvas.height ); // Bottom right point of canvas
            this.crossing = ctx.transformedPoint( 0, ctx.canvas.height ); // Crossing of dim. and measures (up to the left)
        };

    };

    return transformTracker;
} );