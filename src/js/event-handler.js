define( [
    "./utils"
], function ( utils ) {

    /* Static */
    var zoomMinLimit = 0.5,
        zoomMaxLimit = 5,
        scaleFactor = 1.1;

    /* Private functions */

    function updateScrollBars () {
        var axisWidth = this.$scope.doHelper.axisWidth;

        var gridSize = this.renderer.getGridSize(),
            scrollbarX = this.ctx.canvas.width / gridSize.width < 1,
            scrollbarY = this.ctx.canvas.height / gridSize.height < 1;

        var percentLeft = Math.min( Math.max( -this.ctx.canvasMatrix.e / gridSize.width ,0 ), 1 ), // stay within 0-1
            percentTop = Math.min( Math.max( -this.ctx.canvasMatrix.f / gridSize.height ,0 ), 1), // stay within 0-1
            leftMax = this.$element.width() - parseFloat( this.$scope.dimensionScrollbar.width ),
            topMax = this.$element.height() - axisWidth - parseFloat( this.$scope.measureScrollbar.height );

        this.$scope.dimensionScrollbar.left = percentLeft * ( leftMax - axisWidth ) + axisWidth + 'px';
        this.$scope.measureScrollbar.top = percentTop * ( topMax ) + 'px';

        this.$scope.dimensionScrollbar.display = scrollbarX ? '' : 'none';
        this.$scope.measureScrollbar.display = scrollbarY ? '' : 'none';
    }

    function zoom ( focusPoint, delta ) {

        var ctx = this.ctx;
        var pt = ctx.transformedPoint( focusPoint.x, focusPoint.y );

        var factor = Math.pow( scaleFactor, delta );
        var currentScaling = ctx.getTransform().a;

        if ( currentScaling * factor < zoomMinLimit )  {
            factor = zoomMinLimit / currentScaling;
        } else if ( currentScaling * factor > zoomMaxLimit ) {
            factor = zoomMaxLimit / currentScaling;
        }

        ctx.translate( pt.x, pt.y );
        ctx.scale( factor, factor );
        ctx.translate( -pt.x, -pt.y );

        updateScrollBars.call( this );
        this.renderer.render();

    }

    function pan ( swipeDeltaX, swipeDeltaY ) {

        var scaling = this.ctx.getScale(),
            deltaX = swipeDeltaX / scaling,
            deltaY = swipeDeltaY / scaling;

        this.ctx.translate( deltaX, deltaY );

        updateScrollBars.call( this );
        this.renderer.render();

        this.pendingPanning = false;
    }

    function scroll ( e ) {

        if ( !this.$scope.interactive || this.realObject.visible ) {
            return;
        }

        e.preventDefault();

        var delta = e.wheelDelta ? e.wheelDelta / 40 : e.detail ? -e.detail : 0;

        // Scrolling X and Y axis (add possibility to scroll by dragging on scrollbar?)

        var axisWidth = this.$scope.doHelper.axisWidth,
            objOffset = this.$element.offset(),
            cursorPos = {
                x: e.clientX - objOffset.left,
                y: e.clientY - objOffset.top
            };

        if ( cursorPos.x < axisWidth && cursorPos.y < this.ctx.canvas.height ) {
            pan.call( this, 0, delta * 5 );
        } else if ( cursorPos.y > axisWidth && cursorPos.y > this.ctx.canvas.height ) {
            pan.call( this, delta * 5, 0 );
        } else {
            zoom.call( this, { x: e.offsetX, y: e.offsetY }, delta );
        }
    }

    function zoomIn() {

        var delta = 3;
        var focusPoint = {
            x: this.ctx.canvas.width / 2,
            y: this.ctx.canvas.height / 2
        };
        zoom.call( this, focusPoint, delta );
    }

    function zoomOut() {

        var delta = -3;
        var focusPoint = {
            x: this.ctx.canvas.width / 2,
            y: this.ctx.canvas.height / 2
        };
        zoom.call( this, focusPoint , delta );
    }

    function resetZoom () {

        this.renderer.resetZoom();
        this.$scope.dimensionScrollbar.left = this.$scope.doHelper.axisWidth;
        this.$scope.measureScrollbar.top = '0';
    }

    function setChartType ( newType ) {

        var $scope = this.$scope;

        // Remove "active chart" class from buttons
        var activeChartBtn = this.$element.find( '.active-charttype' )[0];

        if ( activeChartBtn ) {
            activeChartBtn.className = activeChartBtn.className.replace( ' active-charttype', '' );
        }

        var invalidateData = false;

        if ( $scope.chartType !== newType && newType === "pie" || $scope.chartType === "pie" ) {
            $scope.dataHandler.clearMatrixData();
            invalidateData = true; // invalidate data when changing from/to pie chart (different data model)
        }

        // Change current chartType and re-draw chart
        $scope.chartType = newType || $scope.chartType;

        if ( this.isSnapshot ) {
            $scope.chartType = this.snapshotData.renderingInfo.chartType;
        }

        this.renderer.setChartType( $scope.chartType );
        if ( this.realObject.visible ) {
            this.realObject.updateChartType( $scope.chartType );
        } else {
            this.renderer.render( invalidateData );
        }

        // Add "active chart" class to correct button
        this.$element.find( '.lui-icon--' + $scope.chartType + '-chart' ).addClass( 'active-charttype' );
    }

    function setAggrFunc ( newFunc ) {

        var $scope = this.$scope;

        $scope.aggrFunc = newFunc;

        if ( this.isSnapshot ) {
            $scope.aggrFunc = this.snapshotData.renderingInfo.aggrFunc || 'Sum'; // For snapshots missing this info
        }

        this.dataHandler.setAggrFunc( $scope.aggrFunc );

        $scope.newData();
    }

    function openSettings () {
        this.$scope.settingsOpen = !this.$scope.settingsOpen;
    }

    function closeSettings ( $event ) {

        var $target = $( $event.target );

        if ( $target.hasClass( 'settings-button' ) || $target.hasClass( 'grid-canvas' ) ) {
            return;
        }

        this.$scope.settingsOpen = false;
    }

    function bindEvents( $scope, $element ) {

        handlePanAndZoom.call( this );

        $element[0].addEventListener( 'DOMMouseScroll', scroll.bind( this ) );
        $element[0].addEventListener( 'mousewheel', scroll.bind( this ) );
        $scope.resetZoom = resetZoom.bind( this );
        $scope.zoomIn = zoomIn.bind( this );
        $scope.zoomOut = zoomOut.bind( this );
        $scope.openRealObject = openRealObject.bind( this );
        $scope.closeRealObject = closeRealObject.bind( this );
        $scope.openSettings = openSettings.bind( this );
        $scope.closeSettings = closeSettings.bind( this );
        $scope.setChartType = setChartType.bind( this );
        $scope.setAggrFunc = setAggrFunc.bind( this );
    }

    function openRealObject ( event ) {

        if ( this.$scope.settingsOpen || !this.$scope.interactive ) {
            this.$scope.settingsOpen = false;
            return;
        }

        var point = {
            x: event.originalEvent.layerX,
            y: event.originalEvent.layerY
        };

        var chartInfo = this.renderer.getInfoFromPoint( point );

        if ( chartInfo ) {

            point.x += this.ctx.canvas.offsetLeft;
            point.y += this.ctx.canvas.offsetTop;

            this.realObject.create( this.$scope.chartType, this.$scope.aggrFunc, chartInfo, point );
        }
    }

    function closeRealObject () {
        if ( this.realObject.visible ) {
            this.realObject.close();
        }
    }

    function handlePanAndZoom () {

        var self = this,
            swipeDelta = {
                x: 0,
                y: 0
            },
            objOffset;

        /* --------- Handle panning ---------- */
        Touche( this.$element[0] ).swipe( {
            id: '.data-overviewer',
            options: {
                which: [1, 2]
            },
            start: function ( e, data ) {

                if ( !self.$scope.interactive || self.realObject.visible ) {
                    this.cancel();
                    return;
                }

                objOffset = self.$element.offset();

                Touche.preventGestures( this.gestureHandler );
            },
            update: function ( e, data ) {

                if( !self.pendingPanning ){
                    self.pendingPanning = true;

                    if ( data.swipe.startPoint.x - objOffset.left >= self.$scope.doHelper.axisWidth && data.swipe.startPoint.y - objOffset.top <= self.ctx.canvas.height ) {
                        utils.requestAnimFrame.call( window, pan.bind( self, swipeDelta.x + data.swipe.curDeltaX, swipeDelta.y + data.swipe.curDeltaY ) );
                    } else if ( data.swipe.startPoint.y - objOffset.top > self.ctx.canvas.height ) {
                        utils.requestAnimFrame.call( window, pan.bind( self, swipeDelta.x + data.swipe.curDeltaX, 0 ) );
                    } else {
                        utils.requestAnimFrame.call( window, pan.bind( self, 0, swipeDelta.y + data.swipe.curDeltaY ) );
                    }

                    swipeDelta.x = swipeDelta.y = 0;
                } else {
                    swipeDelta.x += data.swipe.curDeltaX;
                    swipeDelta.y += data.swipe.curDeltaY;
                }
            },
            end: function () {
                self.pendingPanning = false;
            }
        } );

        var lastCenterPoint;

        Touche( this.ctx.canvas ).pinch( {
            id: '.data-overviewer',
            options: {
                pinchThreshold: 0
            },
            start: function ( e, data ) {

                if ( !self.$scope.interactive || self.realObject.visible ) {
                    this.cancel();
                    return;
                }

                objOffset = self.$element.find( '.grid-canvas').offset();

                lastCenterPoint =  {
                    x: data.centerPoint.x,
                    y: data.centerPoint.y
                };

                Touche.preventGestures( this.gestureHandler );
            },
            update: function ( e, data ) {

                var x,
                    y,
                    curDeltaX = data.centerPoint.x - lastCenterPoint.x,
                    curDeltaY = data.centerPoint.y - lastCenterPoint.y;

                if ( !self.pendingPanning ) {
                    self.pendingPanning = true;
                    x = data.centerPoint.x - objOffset.left;
                    y = data.centerPoint.y - objOffset.top;

                    utils.requestAnimFrame.call( window, function () {

                        zoom.call( self, { x: x, y: y }, data.delta / 20 );
                        pan.call( self, swipeDelta.x + curDeltaX, swipeDelta.y + curDeltaY );
                    } );

                    swipeDelta.x = swipeDelta.y = 0;
                } else {
                    swipeDelta.x += curDeltaX;
                    swipeDelta.y += curDeltaY;
                }

                lastCenterPoint = {
                    x: data.centerPoint.x,
                    y: data.centerPoint.y
                };

                Touche.preventGestures( this.gestureHandler );
            },
            end: function () {
                self.pendingpanning = false;
            }

        } );

    }

    var eventHandler = function ( $scope, $element, realObject, renderer, dataHandler, ctx, isSnapshot, snapshotData ) {

        this.$element = $element;
        this.$scope = $scope;
        this.realObject = realObject;
        this.renderer = renderer;
        this.dataHandler = dataHandler;
        this.ctx = ctx;
        this.pendingPanning = false;
        this.isSnapshot = isSnapshot;
        this.snapshotData = snapshotData;

        var gridSize = this.renderer.getGridSize(),
            scrollbarX = this.ctx.canvas.width / gridSize.width < 1,
            scrollbarY = this.ctx.canvas.height / gridSize.height < 1;

        this.$scope.dimensionScrollbar = {
            left: '75px',
            width: '30px', // relative to amount of dimensions, zoom and object size
            display: isSnapshot || !scrollbarX ? 'none' : ''
        };
        this.$scope.measureScrollbar = {
            top: 0,
            height: '30px', // relative to amount of measures, zoom and object size
            display: isSnapshot || !scrollbarY ? 'none' : ''
        };

        if ( isSnapshot && snapshotData.realObjectVisible ) {
            this.realObject.create( snapshotData.renderingInfo.chartType, snapshotData.renderingInfo.aggrFunc, dimension, measure, point );
            return;
        }

        bindEvents.call( this, $scope, $element );

        setChartType.call( this );
    };

    eventHandler.prototype.destroy = function () {
        Touche( this.$element[0] ).off( "*", '.data-overviewer' );
    };

    return eventHandler;
} );