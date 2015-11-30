define( [
	"text!../html/properties-chart-type.html"],
function ( template ) {

	var defaultChartType = 'line';

	var component = {
		template: template,
		controller: ["$scope", function ( $scope ) {

			$scope.chartType = $scope.data.chartType || defaultChartType;

			$scope.setChartType = function ( chartType ) {

				if ( chartType !== $scope.chartType ) {
					$scope.data.chartType = $scope.chartType = chartType;

					$scope.$emit( 'saveProperties' );
				}
			};
		}]
	};

	return component;
} );