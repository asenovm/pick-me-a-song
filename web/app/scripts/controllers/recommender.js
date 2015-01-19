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
    };

    $scope.fetchInfoFromFacebook = function () {
        $scope.isLoading = true;
        recommendationsService.fetchInfoFromFacebook($scope.showRecommendations);
    };

    $scope.fetchInfoFromLastFm = function (username) {
      $scope.isLoading = true;
      recommendationsService.fetchInfoFromLastFm(username, $scope.showRecommendations);
    };

    window.onFacebookLogin = recommendationsService.onFacebookLogin($scope.setLoading, $scope.showRecommendations);

    if(!window.lastFmInit) {
      window.lastFm = new LastFM({
        apiKey: '5a566b0690f3dcf4958d5bc8bd329e75',
        apiSecret: 'dd065bd63db2120407e869d2641fc693'
      });
      window.lastFmInit = true;
    }
    if(!window.fbInit) {
        FB.init({
          appId      : '1756061591286266',
          xfbml      : true,
          version    : 'v2.1'
        });
        window.fbInit = true;
    }

    FB.getLoginStatus(function (response) {
        if(response.status === "connected") {
            $scope.isLoggedOnFacebook = true;
            recommendationsService.onFacebookConnected(response.authResponse);
        } else {
            $scope.isLoggedOnFacebook = false;
        }
    });

  }]);
