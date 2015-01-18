'use strict';

angular.module('pickMeASong')
  .controller('RecommenderController', ['$scope', '$location', 'recommendationsService', function ($scope, $location, recommendationsService) {

    var PATH_RECOMMENDATIONS = 'recommendations';

    $scope.artists = [{ score: 1 }];

    $scope.showRecommendations = function () {
        $scope.isLoading = false;
        $location.path(PATH_RECOMMENDATIONS);
    };

    $scope.getRecommendations = function () {
        $scope.isLoading = true;
        recommendationsService.fetchRecommendations($scope.artists).finally($scope.showRecommendations);
    };

    window.onFacebookLogin = recommendationsService.onFacebookLogin($scope.showRecommendations);

  }]);
