'use strict';

angular.module('pickMeASong')
  .controller('RecommenderController', ['$scope', '$location', 'recommendationsService', function ($scope, $location, recommendationsService) {

    var PATH_RECOMMENDATIONS = 'recommendations';

    $scope.artists = [{ score: 1 }];

    $scope.showRecommendations = function () {
        $location.path(PATH_RECOMMENDATIONS);
    };

    $scope.getRecommendations = function () {
        recommendationsService.fetchRecommendations($scope.artists).finally($scope.showRecommendations);
    };

    window.onFacebookLogin = recommendationsService.onFacebookLogin($scope.showRecommendations);

  }]);
