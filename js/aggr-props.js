define( [
	"text!../aggr-props.html"],
function ( template ) {

	var defaultAggrFunc = 'Sum';

	var component = {
		template: template,
		controller: ["$scope", function ( $scope ) {

			$scope.aggrFunc = $scope.data.fields.aggrFunc || defaultAggrFunc;

			$scope.setAggrFunc = function ( aggrFunc ) {

				if ( aggrFunc !== $scope.setAggrFunc ) {
					$scope.data.fields.aggrFunc = $scope.aggrFunc = aggrFunc;

					$scope.$emit( 'saveProperties' );
				}
			};
		}]
	};

	return component;
} );