'use strict';

angular.module('pickMeASong')
    .directive('starRatingInit', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var $element = $(element);
            $element.rating({ showClear: false, showCaption: false, size: 'sm', hoverEnabled: false });
            $element.on('rating.change', function (e, value) {
                $scope.track.userValue = value;
                $scope.$emit('trackRateChange');
            });
        }
    };
});
