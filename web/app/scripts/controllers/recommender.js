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

    $scope.setLoading = function () {
        $scope.$apply(function () {
            $scope.isLoading = true;
        });
    }

    window.onFacebookLogin = recommendationsService.onFacebookLogin($scope.setLoading, $scope.showRecommendations);

  }]);
