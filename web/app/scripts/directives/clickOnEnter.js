'use strict';

angular.module('pickMeASong')
    .directive('clickOnEnter', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var KEYCODE_ENTER = 13;

            $(document).on('keypress', function (e) {
                if(e.keyCode === KEYCODE_ENTER) {
                    $(element).click();   
                }
            });
        }
    };
});
