define( [
    'qlik',
    "./transform-tracker",
    "./utils"
], function ( qlik, TransformTracker, utils ) {

    'use strict';

    /* Static constants */
    var graphWidth = 120,
        graphHeight = 52,
        graphSpace = 60,
        barColor = '#35609B';

    /* Private functions */

    /**
     * Draws text message "No data" on canvas
     * @param ctx
     * @param x
     * @param y
     */
    function noChartData ( ctx, x, y ) {

        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "12px Verdana";
        ctx.fillText( "No data", x, y, graphWidth );
    }

    function drawBarChart ( ctx, gX, gY, dataPoints, measureMax, measureMin ) {

        var w,
            h,
            x,
            y,
            barSpace,
            dataPlotted = false,
            range,
            yCenter;

        if ( measureMax > 0 && measureMin > 0 ) {
            range = measureMax;
            yCenter = graphHeight;
        } else if ( measureMax < 0 && measureMin < 0) {
            range = -measureMin;
            yCenter = 0;
        } else {
            range = Math.abs( measureMax - measureMin );
            yCenter = Math.abs( measureMax ) > Math.abs( measureMin ) ? measureMax / range * graphHeight : ( 1 + ( measureMin / range ) ) * graphHeight;
        }

        for ( var k = 0; k < dataPoints.length; k++ ) {

            w = ( graphWidth * 0.6 ) / dataPoints.length;
            if ( w > graphWidth / 6 ) {
                w = graphWidth / 6;
            }

            barSpace = w / 1.5;

            h = Math.abs( dataPoints[k][1].qNum ) / range * graphHeight// + graphHeight - yCenter;
            h = !h || isNaN( h ) ? 1 : h; // This could be improved.. min height is 1 for now.
            x = gX + k * ( w + barSpace );
            y = dataPoints[k][1].qNum < 0 ? gY + yCenter : gY + yCenter - h;

            if ( range === 0 || isNaN( y ) ) {
                y = gY + ( graphHeight / 2 );
            }

            ctx.rect ( x, y, w, h );
            dataPlotted = true;
        }

        if ( !dataPlotted ) {
            noChartData( ctx, gX + graphWidth / 2, gY + graphHeight / 2 );
        }
    }

    function drawLineChart ( ctx, gX, gY, dataPoints, measureMax, measureMin ) {

        var w,
            x,
            y,
            range = Math.abs( measureMax - measureMin ),
            dataPlotted = false;

        if ( dataPoints.length === 1 && !isNaN( dataPoints[0][1].qNum ) ) {
            //draw a circle
            x = gX + graphWidth / 2;
            y = gY + graphHeight / 2;
            ctx.moveTo( x - 0.5, y );
            ctx.arc( x, y, 0.5, 0, Math.PI * 2, true );

            return;
        }

        for ( var k = 0; k < dataPoints.length; k++ ) {

            w = graphWidth / ( dataPoints.length - 1 );

            x = gX + k * w;
            y = gY + graphHeight - ( dataPoints[k][1].qNum - measureMin ) / range * graphHeight;

            // This happens when range === 0 - would result in no line drawn
            // Value can end up out of range because of how data reduction works in sense (approximation) - therefore limit to max/min
            if ( range === 0 || isNaN( y ) ) {
                y = gY + ( graphHeight / 2 );
            } else if ( dataPoints[k][1].qNum < measureMin ) {
                y = gY + graphHeight;
            } else if ( dataPoints[k][1].qNum > measureMax ) {
                y = gY;
            }

            if ( k === 0 || isNaN( dataPoints[k][1].qNum ) ) {
                ctx.moveTo( x, y );
            } else {
                ctx.lineTo( x, y );
                dataPlotted = true;
            }
        }

        if ( !dataPlotted ) {
            noChartData( ctx, gX + graphWidth / 2, gY + graphHeight / 2 );
        }

    }

    function isPieDataValid ( dataPoints, total ) {

        var validPieData = total > 0;

        dataPoints.forEach( function ( value ) {
            if ( value <= 0 ) {
                validPieData = false;
                return;
            }
        } );

        return validPieData;
    }

    function drawPieChart ( ctx, gX, gY, dataPoints, total ) {

        // Check for zero or negative values
        if ( !isPieDataValid( dataPoints, total ) ) {

            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = "12px Verdana";
            ctx.fillText( "Invalid data", gX + graphWidth / 2, gY + graphHeight / 2, graphWidth );

            return;
        }

        var lastend = -Math.PI / 2;

        var hasOthers = dataPoints.length > utils.PIE_CHART_OTHERS_LIMIT;
        var palette;

        if ( hasOthers ) {
            palette = utils.colorPalette[Math.min( utils.PIE_CHART_OTHERS_LIMIT - 2, dataPoints.length - 2 )];
        } else {
            var palette = utils.colorPalette[Math.min( utils.PIE_CHART_OTHERS_LIMIT - 1, dataPoints.length - 1 )];
        }

        for ( var i = 0; i < dataPoints.length; i++ ) {

            ctx.beginPath();
            ctx.moveTo( gX + graphWidth / 2, gY + graphHeight / 2 );

            if ( i < utils.PIE_CHART_OTHERS_LIMIT - 1 || !hasOthers ) {
                ctx.fillStyle = palette[i];
                ctx.arc( gX + graphWidth / 2, gY + graphHeight / 2, graphHeight / 2, lastend, lastend + ( Math.PI * 2 * ( dataPoints[i] / total ) ), false );
            } else {
                ctx.fillStyle = "#A5A5A5";
                ctx.arc( gX + graphWidth / 2, gY + graphHeight / 2, graphHeight / 2, lastend, -Math.PI / 2, false );
            }


            ctx.lineTo( gX + graphWidth / 2, gY + graphHeight / 2 );

            ctx.fill();
            lastend += Math.PI * 2 * ( dataPoints[i] / total );
        }
    }

    function drawChartIcon ( ctx, chartType, gX, gY ) {

        ctx.fillStyle = "#A5A5A5";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "50px LUI icons";

        var charCode;

        if ( chartType === 'bar' ) {
            charCode = '0x0021';
        } else if ( chartType === 'line' ) {
            charCode = '0x0025';
        } else if ( chartType === 'pie' ) {
            charCode = '0x0026';
        }

        ctx.fillText( String.fromCharCode( charCode ), gX + graphWidth / 2, gY + graphHeight / 2 - 4 );
        ctx.fillStyle = barColor;
    }

    function drawGridLines ( ctx ) {

        var s = ctx.getScale(),
            area = this.visibleArea,
            x,
            y;

        ctx.beginPath();
        ctx.strokeStyle = 'gray';

        // Measure lines
        for ( var i = area.top; i < ( area.top + area.height ); i++ ) {
            y = i * graphHeight + ( i * graphSpace );// + ( graphHeight / 2 );

            ctx.moveTo( ctx.topLeft.x, y );
            ctx.lineTo( ( area.left + area.width ) * ( graphWidth + graphSpace ), y );
        }

        // Dimension lines
        for ( var i = area.left + 1; i <= ( area.left + area.width ); i++ ) {
            x = i * graphWidth + ( i * graphSpace );// + ( graphWidth / 2 ) + s;

            ctx.moveTo( x, 0 );
            ctx.lineTo( x, ctx.crossing.y );
        }

        ctx.stroke();
    }

    function drawFieldTitles ( scale, offsetX, offsetY ) {

        var s = this.chartScale, // = 1 if not snapshot
            dataMatrix = this.dataHandler.matrix,
            axisWidth = this.doHelper.axisWidth,
            gridHeight = scale * ( graphHeight + graphSpace ),
            gridWidth = scale * ( graphWidth + graphSpace ),
            dimensionMargin = gridWidth - axisWidth * 0.93, // titles has 93% width of "axis width"
            measureMargin = gridHeight - 20 * s,
            dimNbrOffset = Math.round( ( offsetX ) / gridWidth ),
            measNbrOffset = Math.ceil( offsetY / gridHeight ),
            gridsOutsideTop = measNbrOffset < 0 ? -measNbrOffset : 0,
            gridsOutsideLeft = dimNbrOffset < 0 ? -dimNbrOffset : 0,
            top = offsetY + gridHeight / 2 - 22 * s / 2 + gridsOutsideTop * gridHeight,
            left = offsetX + gridWidth / 2 - 100 * s / 2 + axisWidth + gridsOutsideLeft * gridWidth,
            areaHeight = this.$element.height() - axisWidth * 0.93,
            areaWidth = this.$element.width() - axisWidth,
            lastVisibleRow = Math.round( ( areaHeight - offsetY ) / gridHeight ),
            lastVisibleCol = Math.ceil( ( areaWidth - offsetX ) / gridWidth ),
            measure;

        lastVisibleRow = lastVisibleRow < dataMatrix[0].measures.length ? lastVisibleRow : dataMatrix[0].measures.length;
        lastVisibleCol = lastVisibleCol < dataMatrix.length ? lastVisibleCol : dataMatrix.length;

        // Decide which titles should be rendered
        this.dimensionTitles.length = 0;
        this.measureTitles.length = 0;

        for( var i = gridsOutsideLeft; i < lastVisibleCol; i++ ) {
            this.dimensionTitles.push( dataMatrix[i].name || dataMatrix[i].title );
        }

        for ( var i = gridsOutsideTop; i < lastVisibleRow; i++ ) {
            measure = dataMatrix[0].measures[i];
            if ( measure.name ) {
                this.measureTitles.push( measure.aggrFunc ? measure.aggrFunc + '(' + measure.name + ')' : measure.name );
            } else {
                this.measureTitles.push( measure.title );
            }
        }

        // Set styling to get the title positions correct
        this.measureTitlesPositioning['top'] = top + 'px';
        this.measureTitlesPositioning['width'] = axisWidth + 'px';
        this.measureTitlesPositioning['margin-bottom'] = measureMargin + 'px';

        this.dimensionTitlesPositioning['left'] = left + 'px';
        this.dimensionTitlesPositioning['width'] = axisWidth + 'px';
        this.dimensionTitlesPositioning['margin-right'] = dimensionMargin + 'px';
    }

    /**
     * Always keeps at least a part of top rightmost grid cell visible (to avoid user from getting lost while zooming and panning)
     */
    function limitPanning () {

        var dataMatrix = this.dataHandler.matrix,
            ctx = this.ctx,
            gridWidth = graphWidth + graphSpace,
            gridHeight = graphHeight + graphSpace;

        var topRightPoint = {
            x: gridWidth * ( dataMatrix.length - 0.5 ),
            y: gridHeight / 2
        };

        if ( topRightPoint.x < ctx.crossing.x ) {
            ctx.translate( ctx.crossing.x - topRightPoint.x, 0 );
            ctx.updateRefPoints();
        }

        if ( topRightPoint.y > ctx.crossing.y ) {
            ctx.translate( 0, ctx.crossing.y - topRightPoint.y );
            ctx.updateRefPoints();
        }
    }

    function updateVisibility () {

        var dataMatrix = this.dataHandler.matrix,
            s = this.ctx.getScale(), // scaling
            offsetX = this.ctx.canvasMatrix.e,
            offsetY = this.ctx.canvasMatrix.f,
            top = -Math.floor( ( offsetY + ( graphHeight + graphSpace ) * s ) / ( graphHeight + graphSpace ) / s ),
            left = -Math.floor( ( offsetX + ( graphWidth + graphSpace ) * s ) / ( graphWidth + graphSpace ) / s ),
            width = Math.ceil( ( this.ctx.canvas.clientWidth ) / ( s * ( graphWidth + graphSpace ) ) ) + 1,// +1 compensation...
            height = Math.ceil( this.ctx.canvas.clientHeight / ( s * ( graphHeight + graphSpace ) ) ) + 1;

        if ( left + width > dataMatrix.length ) {
            width = dataMatrix.length - left;
        }

        if ( top + height > dataMatrix[0].measures.length ) {
            height = dataMatrix[0].measures.length - top;
        }

        this.visibleArea = {
            top: top < 1 ? 0 : top, // never negative index
            left: left < 1 ? 0 : left, // never negative index
            width: left < 0 ? width + left : width,
            height: top < 0 ? height + top : height
        };
    }

    function drawCanvas() {

        var gX,
            gY,
            dataMatrix = this.dataHandler.matrix,
            ctx = this.ctx,
            s = ctx.getScale(),
            chartType = this.chartType,
            area = this.visibleArea,
            chartsAsIcons = Math.round( s * 100 ) / 100 < this.optimizer.zoomRenderLimit; // s in the matrix can have a lot of decimals (non uniform scaling...)

        if ( this.isSnapshot ) {
            chartsAsIcons = this.snapshotData.renderingInfo.chartsAsIcons;
        }

        ctx.lineWidth = 1 / s;

        // Clear the entire grid canvas
        ctx.clearRect( ctx.topLeft.x, ctx.topLeft.y, ctx.bottomRight.x - ctx.topLeft.x, ctx.bottomRight.y - ctx.topLeft.y );

        /* ----------- Draw the grid/lines ---------- */
        drawGridLines.call( this, ctx );

        /* ------------ Draw the charts ----------- */

        ctx.fillStyle = barColor;
        ctx.strokeStyle = barColor;
        ctx.lineWidth = 2 / s;
        ctx.lineJoin = 'round';

        ctx.beginPath();

        for ( var i = area.left; i < ( area.left + area.width ); i++ ) { // Dimensions
            gX = i * graphWidth + i * graphSpace + graphSpace / 2;

            for ( var j = area.top; j < ( area.top + area.height ); j++ ) { // Measures

                var measure = dataMatrix[i].measures[j],
                    dataPoints = measure.data;

                gY = j * graphHeight + j * graphSpace + graphSpace / 2;

                if ( !chartsAsIcons && dataPoints.length ) {

                    if ( chartType === 'bar' ) {
                        drawBarChart( ctx, gX, gY, dataPoints, measure.max, measure.min );
                    } else if ( chartType === 'line' ) {
                        drawLineChart( ctx, gX, gY, dataPoints, measure.max, measure.min );
                    } else if ( chartType === 'pie' ) {
                        drawPieChart( ctx, gX, gY, dataPoints, measure.total );
                    }
                } else {
                    drawChartIcon( ctx, chartType, gX, gY );
                }
            }
        }

        if ( chartType === 'bar' ) {
            ctx.fill();
        } if ( chartType === 'line' ) {
            ctx.stroke();
        }

        // Dimensions and measures title's

        drawFieldTitles.call( this, s, ctx.canvasMatrix.e, ctx.canvasMatrix.f );

        if ( !$( ctx.canvas ).scope().$root.$$phase ) {
            $( ctx.canvas ).scope().$digest();
        }
    }

    function scaleSnapshot ( $element, ctx, snapshotData ) {

        var m = snapshotData.renderingInfo.canvasMatrix;

        var origWidth = snapshotData.object.size.w,
            currentWidth = $element.width();

        if ( snapshotData.object.freeResize ) {
            this.doHelper.setChartScale( 1 );
        } else {
            this.doHelper.setChartScale( currentWidth / origWidth );
        }

        this.chartScale = this.doHelper.chartScale;

        ctx.setTransform( m.a * this.chartScale, m.b, m.c, m.d * this.chartScale, m.e * this.chartScale, m.f * this.chartScale );
    }

    function stepZoom ( ctx, zoomStep, xStep, yStep ) {

        var m1 = ctx.canvasMatrix,
            m2 = [ m1.a + zoomStep, 0, 0, m1.d + zoomStep, m1.e + xStep, m1.f + yStep ];

        ctx.setTransform( m2[0], m2[1], m2[2], m2[3], m2[4], m2[5] );
    }

    /* Class */

    var renderer = function ( $element, ctx, dataHandler, optimizer, chartType, dimensionTitles, measureTitles, dimensionTitlesPositioning, measureTitlesPositioning, doHelper, isSnapshot, snapshotData ) {

        this.$element = $element;
        this.ctx = ctx;
        this.dataHandler = dataHandler;
        this.optimizer = optimizer;
        this.chartType = chartType;
        this.dimensionTitles = dimensionTitles;
        this.measureTitles = measureTitles;
        this.dimensionTitlesPositioning = dimensionTitlesPositioning;
        this.measureTitlesPositioning = measureTitlesPositioning;
        this.doHelper = doHelper;
        this.isSnapshot = isSnapshot;
        this.snapshotData = snapshotData;
        this.chartScale = 1;
        this.initZoom = 1;
        this.animation = {};

        this.transformTracker = new TransformTracker( this.ctx, doHelper.axisWidth );

        if ( this.isSnapshot ) {
            scaleSnapshot.call( this, this.$element, this.ctx, this.snapshotData, this.doHelper );
        }
    };

    renderer.prototype.setChartType = function ( chartType ) { // Define as object property?
        this.chartType = chartType;
    };

    renderer.prototype.render = function ( dataInvalidated ) {

        if ( this.dataHandler.insufficientFields ) {
            return;
        }

        if ( this.isSnapshot ) {
            scaleSnapshot.call( this, this.$element, this.ctx, this.snapshotData, this.doHelper );
        }

        this.ctx.updateRefPoints();
        limitPanning.call( this );

        var s = this.ctx.getScale();
        var granularity = utils.getGranularity( this.isSnapshot ? this.snapshotData.renderingInfo.canvasMatrix.a : s );

        updateVisibility.call( this );

        drawCanvas.call( this );

        if ( !this.isSnapshot && s > this.optimizer.zoomDataLimit && !Object.keys( this.animation ).length ) {
            this.dataHandler.throttledUpdate( this.visibleArea, granularity, drawCanvas.bind( this ), dataInvalidated, this.chartType );
        }
    };

    renderer.prototype.resize = function () {

        if ( !this.isSnapshot ) {
            this.applyCanvasMatrix( this.ctx.canvasMatrix );
        }

        this.render();
    };

    renderer.prototype.applyCanvasMatrix = function ( canvasMatrix ) {

        var ctx = this.ctx,
            scale = canvasMatrix.a,
            panning = {
                x: ctx.canvasMatrix.e,
                y: ctx.canvasMatrix.f
            };

        this.transformTracker.reset();

        var centerPoint = ctx.transformedPoint( ctx.canvas.width / 2, ctx.canvas.height / 2 );

        ctx.translate( centerPoint.x, centerPoint.y );
        ctx.scale( scale, scale );
        ctx.translate( -centerPoint.x, -centerPoint.y );

        var panningOffset = ctx.transformedPoint( panning.x, panning.y );

        ctx.translate( panningOffset.x, panningOffset.y );
    };

    renderer.prototype.resetZoom = function () {

        var ctx = this.ctx,
            s = ctx.getScale(),
            initZoom = this.initZoom,
            animation = this.animation;

        // Prepare animation
        if ( !Object.keys( animation ).length ) {
            var steps = 15; // animation speed
            animation.zoomStep = ( initZoom - s ) / steps;
            animation.xStep = -ctx.canvasMatrix.e / steps;
            animation.yStep = -ctx.canvasMatrix.f / steps;
        }

        animation.zoomStep = Math.abs( s - initZoom ) > Math.abs( animation.zoomStep ) ? animation.zoomStep : 0;
        animation.xStep = Math.abs( ctx.canvasMatrix.e ) > Math.abs( animation.xStep ) ? animation.xStep : 0;
        animation.yStep = Math.abs( ctx.canvasMatrix.f ) > Math.abs( animation.yStep ) ? animation.yStep : 0;

        if ( animation.zoomStep !== 0 || animation.xStep !== 0 || animation.yStep !== 0 ) {
            utils.requestAnimFrame.call( window, this.resetZoom.bind( this ) );

            stepZoom( ctx, animation.zoomStep, animation.xStep, animation.yStep );

            this.render();
        } else {

            ctx.setTransform( initZoom, 0, 0, initZoom, 0, 0 );
            this.animation = {};
            this.render();
        }
    };

    renderer.prototype.getInfoFromPoint = function ( point ) {

        var gridHeight = graphHeight + graphSpace,
            gridWidth = graphWidth + graphSpace,
            transformedPoint = this.ctx.transformedPoint( point.x, point.y ),
            dimensionIndex = Math.floor( ( transformedPoint.x  ) / gridWidth),
            measureIndex = Math.floor( ( transformedPoint.y  ) / gridHeight );

        if ( this.dataHandler.matrix[dimensionIndex] && this.dataHandler.matrix[0].measures[measureIndex] ) {
            return {
                dimension: this.dataHandler.matrix[dimensionIndex],
                measure: this.dataHandler.matrix[0].measures[measureIndex]
            };
        } else {
            return null;
        }

    };

    renderer.prototype.getCanvasMatrix = function () {
        return this.ctx.canvasMatrix;
    };

    renderer.prototype.setOptimizedZoom = function ( center ) {

        if ( this.isSnapshot ) {
            return;
        }

        var optimizedZoom = this.optimizer.zoomRenderLimit,
            ctx = this.ctx;

        if ( center ) {

            var focusPoint = ctx.transformedPoint( ctx.canvas.width / 2, ctx.canvas.height / 2 );

            ctx.translate( focusPoint.x, focusPoint.y );
            ctx.scale( optimizedZoom / ctx.getScale(), optimizedZoom / ctx.getScale() );
            ctx.translate( -focusPoint.x, -focusPoint.y );
        } else {
            ctx.scale( optimizedZoom, optimizedZoom );
        }

        this.initZoom = ctx.getScale();

        this.ctx.updateRefPoints();
    };

    renderer.prototype.getGridSize = function () {

        var s = this.ctx.getScale(),
            nbrOfDimensions = this.dataHandler.matrix.length,
            nbrOfMeasures = this.dataHandler.matrix.length ? this.dataHandler.matrix[0].measures.length : 0,
            cellHeight = s * ( graphHeight + graphSpace ), // + s for grid lines?
            cellWidth = s * ( graphWidth + graphSpace );

        return {
            width: nbrOfDimensions * cellWidth,
            height: nbrOfMeasures * cellHeight
        };

    };

    renderer.prototype.isRendered = function () {
        return !!this.ctx.canvasMatrix;
    };

    return renderer;

} );