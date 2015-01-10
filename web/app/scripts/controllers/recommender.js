'use strict';

angular.module('pickMeASong')
  .controller('RecommenderController', ['$scope', '$location', 'recommendationsService', function ($scope, $location, recommendationsService) {

    var PATH_RECOMMENDATIONS = 'recommendations';

    $scope.artists = [{ score: 1 }];

    $scope.getRecommendations = function () {
        recommendationsService.getRecommendations($scope.artists).finally(function () {
            $location.path(PATH_RECOMMENDATIONS);
        });
    };
  }]);
