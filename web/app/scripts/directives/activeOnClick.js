'use strict';

angular.module('pickMeASong')
    .directive('activeOnClick', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var $element = $(element),
                $elementListItem = $element.closest('li'),
                $listItems = $element.closest('ul').find('li');

            $element.on('click', function () {
                $listItems.removeClass('active');
                $elementListItem.addClass('active');
            });
        }
    };
});
