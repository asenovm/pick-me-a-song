'use strict';

angular.module('pickMeASong')
    .directive('radioClick', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var $element = $(element),
                $others = $element.siblings(),
                key = attrs.key,
                value = JSON.parse(attrs.radioClick);

            if($scope[key] === value) {
                $element.addClass('active');
                $others.removeClass('active');
            }

            $element.on('touchstart click', function () {
                $scope.setValue(key, value);
            });
        }
    };
});
