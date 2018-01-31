require("amd-loader");

define( [
    'chai',
    'sinon',
    './utils'
], function ( chai, sinon, utils ) {

    'use strict';

    var expect = chai.expect;

    describe( 'utils', function (  ) {
        describe( 'getPaletteForPieChart', function (  ) {

            var sandbox = sinon.sandbox.create();
            var othersLimitStub;
            var dataPoints;
            var total;
            var hasOthers = true;
            var hasNullsWithinLimit = true;
            var othersLimit;

            function getPaletteColorCount () {
                othersLimitStub.get(function getterFn() {
                    return othersLimit;
                });
                var palette = utils.getPaletteForPieChart( dataPoints, total, hasOthers, hasNullsWithinLimit );
                return palette.length;
            }

            before( function (  ) {
                othersLimitStub = sandbox.stub( utils, 'PIE_CHART_OTHERS_LIMIT' );
            } );

            beforeEach( function (  ) {
                dataPoints = [
                    {isNull: false, value: 4},
                    {isNull: false, value: 3},
                    {isNull: false, value: 3},
                    {isNull: false, value: 3},
                    {isNull: false, value: 2},
                    {isNull: false, value: 2},
                    {isNull: false, value: 2},
                    {isNull: false, value: 2},
                    {isNull: false, value: 2},
                    {isNull: false, value: 1},
                    {isNull: false, value: 1}];

                total = 0;
                dataPoints.forEach( function ( point ) {
                    total += point.value;
                });

                hasOthers = false;
                hasNullsWithinLimit = false;

                othersLimit = 10; // limit will be mocked in utils module
            } );

            after( function (  ) {
                sandbox.restore();
            } );

            it( '0 points, othersLimit = 10, total sum = 0, hasOthers = false, hasNullsWithinLimit = false => 0 colors', function (  ) {

                dataPoints = [];
                hasOthers = false;
                hasNullsWithinLimit = false;

                var nbrOfColors = getPaletteColorCount();

                expect(nbrOfColors).to.equal(0);
            } );

            it( '1 points, othersLimit = 10, total sum = 5, hasOthers = false, hasNullsWithinLimit = false => 1 colors', function (  ) {

                dataPoints = [{isNull: false, value: 5}];
                hasOthers = false;
                hasNullsWithinLimit = false;

                var nbrOfColors = getPaletteColorCount();

                expect(nbrOfColors).to.equal(1);
            } );

            it( '1 points, othersLimit = 10, total sum = 50, hasOthers = true, hasNullsWithinLimit = true => 1 colors', function (  ) {

                dataPoints = [{isNull: true, value: 5}];
                hasOthers = true;
                hasNullsWithinLimit = true;

                var nbrOfColors = getPaletteColorCount();

                expect(nbrOfColors).to.equal(0);
            } );

            it( '11 points, othersLimit = 12, total sum = 25, hasOthers = false, hasNullsWithinLimit = false => 10 colors', function (  ) {

                othersLimit = 12;
                var nbrOfColors = getPaletteColorCount();

                expect(nbrOfColors).to.equal(11);
            } );

            it( '11 points, othersLimit = 10, total sum = 25, hasOthers = true, hasNullsWithinLimit = false => 9 colors', function (  ) {

                hasOthers = true;

                var nbrOfColors = getPaletteColorCount();

                expect(nbrOfColors).to.equal(9);
            } );

            it( '11 points, othersLimit = 10, total sum = 25, hasOthers = true, hasNullsWithinLimit = true => 8 colors', function (  ) {

                hasOthers = true;
                dataPoints[5].isNull = true;
                hasNullsWithinLimit = true;

                var nbrOfColors = getPaletteColorCount();

                expect(nbrOfColors).to.equal(8);
            } );
        } );
    } );
} );