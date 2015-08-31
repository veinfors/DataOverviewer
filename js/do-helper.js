define( [], function () {

    var axisWidthParam = 75;

    var doHelper = function ( $element ) {

        this.$element = $element;
        this.chartScale = 1;
        this.updateAxisWidth();
    };

    doHelper.prototype.setChartScale = function ( scale ) {
        this.chartScale = scale;
    };

    doHelper.prototype.updateAxisWidth = function () {
        this.axisWidth = this.chartScale * axisWidthParam;
    };

    return doHelper;

} );