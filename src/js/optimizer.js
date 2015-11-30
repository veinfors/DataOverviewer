define( [], function () {

    /* Private */
    var zoomDataLimitDivider = 4.5, // Maybe these should be fine tuned
        zoomRenderLimitDivider = 3.5;

    function updateZoomLimits () {
        this.zoomDataLimit = Math.round( ( this.objectSizeParam + this.networkSpeedParam ) / zoomDataLimitDivider * 100 ) / 100; // 2 decimals
        this.zoomRenderLimit = Math.round( ( this.objectSizeParam + this.networkSpeedParam ) / zoomRenderLimitDivider * 100 ) / 100;
    }

    /* Class */
    var optimizer = function () {

        // default values...
        this.zoomDataLimit = 0.9;
        this.zoomRenderLimit = 1.0;
        this.objectSizeParam = 1; // 1 for small, 2 for large, 3 for large
        this.networkSpeedParam = 1; // 1 for fast, 2 for slow
    };

    /* non-static functions - move to another class? */
    optimizer.prototype.updateObjectSizeParam = function ( objectElement ) {

        var objectArea = objectElement.clientWidth * objectElement.clientHeight;

        if ( objectArea <= 200000 ) {
            this.objectSizeParam = 1;
        } else if ( objectArea > 200000 && objectArea < 420000 ) {
            this.objectSizeParam = 2;
        } else {
            this.objectSizeParam = 3;
        }

        updateZoomLimits.call( this );
    };

    optimizer.prototype.updateNetworkSpeedParam = function ( responseTime ) {

        if ( responseTime ) {
            if ( responseTime <= 200 ) {
                this.networkSpeedParam = 1;
            } else {
                this.networkSpeedParam = 2;
            }
        }

        updateZoomLimits.call( this );
    };

    return optimizer;

} );
