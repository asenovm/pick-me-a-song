'use strict';

angular.module('pickMeASong')
    .directive('activateOnInit', ['$location', function ($location) {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var $element = $(element),
                $allElements = $element.siblings(),
                path = $location.path();

            if((!path || path === '/') && $element.hasClass('home')) {
                $element.addClass('active');
            } else if (path === '/about' && $element.hasClass('about')) {
                $element.addClass('active');
            } else if (path === '/settings' && $element.hasClass('settings')) {
                $element.addClass('active');
            }
        }
    };
}]);
