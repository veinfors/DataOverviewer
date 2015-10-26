define( [
	"jquery",
	"qlik",
	"./utils",
	"text!../props-template.html"],
function ( $, qlik, utils, template ) {

	var defaultAggrFunc = 'Sum';

	function indexOfField( list, fieldModel, fieldType ) {

		for ( var i = 0; i < list.length; i++ ) {

			if ( fieldType === 'field' ) {
				if ( fieldModel.qName === list[i].name ) {
					return i;
				}
			} else {
				if ( list[i].id === fieldModel.qInfo.qId ) {
					return i;
				}
			}
		}

		return -1;

	}

	function updateProps ( $scope, fieldModel, fieldType ) {

		var axis = $scope.axis;

		if ( !$scope.data.fields[axis] ) {
			$scope.data.fields[axis] = [];
		} else {
			// remove old, invalid fieldModel
			var index = indexOfField( $scope.data.fields[axis], fieldModel, fieldType );
			if ( index !== -1 ) {
				$scope.data.fields[axis].splice( index, 1 );
			}
		}

		if ( fieldModel.selected ) {
			fieldModel.aggrFunc = fieldModel.aggrFunc || defaultAggrFunc;
			if ( fieldType === 'field' ) {
				$scope.data.fields[axis].push( { name: fieldModel.qName, aggrFunc: fieldModel.aggrFunc || defaultAggrFunc } );
			} else {
				$scope.data.fields[axis].push( { id: fieldModel.qInfo.qId, title: fieldModel.qMeta.title } );
			}

		}

		$scope.$emit( 'saveProperties' );
	}

	var component = {
		template: template,
		controller: ["$scope", "$element", function ( $scope, $element ) {

			$scope.aggrFunc = defaultAggrFunc;

			$scope.setAggrFunc = function ( aggrFunc ) {

				if ( aggrFunc !== $scope.pickingAggrForModel.aggrFunc ) {
					$scope.pickingAggrForModel.aggrFunc = aggrFunc;
					updateProps( $scope, $scope.pickingAggrForModel, $scope.pickingAggrFieldType );
				}
			};

			$scope.closeAggrPicker = function ( $event ) {

				var $target = $( $event.target );

				if ( $target.hasClass( 'do-props-aggr-btn' ) || $target.parents( '.do-props' ).length ) {
					return;
				}

				$scope.aggrPickerOpen = false;
				$scope.pickingAggrForModel = null;
				$scope.pickingAggrFieldType = null;
				$scope.pickerForScopeId = null;
			};

			utils.subscribeFieldUpdates( function ( data ) {

				if ( $scope.definition.axis === 'x' ) {
					$scope.dimensions = data.qDimensionList.qItems;
				} else {
					$scope.measures = data.qMeasureList.qItems;
				}

				$scope.fields = data.qFieldList.qItems;
			} );

			$scope.onClick = function ( e, fieldType ) {

				var $target = $( e.target );

				if ( $scope.aggrPickerOpen ) {
					$scope.aggrPickerOpen = false;
					$scope.pickerForScopeId = null;
					return;
				}

				if ( $target.hasClass( 'do-props-aggr-btn' ) ) {
					$scope.aggrPickerPosition = {
						left: 3 + 'px',
						top: ( $target[0].offsetTop + 32 ) + 'px'
					}
					$scope.aggrPickerOpen = !$scope.aggrPickerOpen;
					$scope.pickingAggrForModel = $target.scope()[fieldType];
					$scope.pickingAggrFieldType = fieldType;
					$scope.pickerForScopeId = $target.scope().$id;
				} else if ( $target.scope()[fieldType] ) {

					var fieldModel = $target.scope()[fieldType];
					fieldModel.selected = !fieldModel.selected;
					updateProps( $scope, fieldModel, fieldType );
				}

			};

			$scope.onChange = function () {
				console.log('oChange!');
			};

			$scope.$on( "datachanged", function () {
				console.log( 'datachanged' )
			} );
		}]
	};

	return component;
} );