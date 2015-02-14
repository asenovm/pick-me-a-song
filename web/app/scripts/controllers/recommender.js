'use strict';

angular.module('pickMeASong')
  .controller('RecommenderController', ['$scope', '$location', '$route', 'recommendationsService', function ($scope, $location, $route, recommendationsService) {

    var PATH_RECOMMENDATIONS = 'recommendations';
    var PATH_RATE_ITEMS = 'rateItems';

    var MIN_RATE_LIKED_ITEM = 2.5;

    $scope.minNumberRatedTracks = 5;

    $scope.showRecommendations = function () {
        $scope.isLoading = false;
        $location.path(PATH_RECOMMENDATIONS);
    };

    if ($location.path().indexOf('rateItems') >= 0) {
        $scope.tracksToRate = recommendationsService.getTracksToRate();
        $scope.callback = $scope.showRecommendations;
    } else {
        $scope.tracksToRate = recommendationsService.getRecommendations();
        $scope.callback = $route.reload;
    }

    $scope.getRecommendations = function () {
        $scope.isLoading = true;
        recommendationsService.fetchRecommendations($scope.artists, getRatedTracks($scope.tracksToRate), $scope.likedTracks, $scope.tracksToRate).finally($scope.callback);
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

    $scope.rateItems = function () {
        recommendationsService.fetchTracksToRate(function (tracks) {
            $location.path(PATH_RATE_ITEMS);
            $scope.tracksToRate = tracks;
        });
    };

    $scope.submitRatedTracks = function () {
        var ratedTracks = getRatedTracks($scope.tracksToRate),
            ratedTracksUniqueArtists = _.uniq(ratedTracks, false, function (track) {
                return track.artist.name;
            });

        $scope.likedTracks = _.filter(ratedTracks, function (track) {
            return track.userValue >= MIN_RATE_LIKED_ITEM;
        });

        if(ratedTracks.length >= $scope.minNumberRatedTracks) {
            $scope.artists = _.map(ratedTracksUniqueArtists, function (track) {
                var artistTotalValue = 0,
                    artistTotalRatings = 0;

                _.each(ratedTracks, function (ratedTrack) {
                    if(ratedTrack.artist.name === track.artist.name) {
                        ++artistTotalRatings;
                        artistTotalValue += parseInt(ratedTrack.userValue, 10);
                    }
                });

                return {
                    name: track.artist.name,
                    score: artistTotalValue / artistTotalRatings,
                    count: artistTotalRatings
                };
            });

            $scope.submitError = false;
            $scope.getRecommendations();
        } else {
            $scope.submitError = true;
        }

    };

    function getRatedTracks(tracks) {
        return _.filter(tracks, function (track) {
            return track.userValue;
        });
    }

    window.onFacebookLogin = recommendationsService.onFacebookLogin($scope.setLoading, $scope.showRecommendations);

    if(!window.lastFmInit) {
      window.lastFm = new LastFM({
        apiKey: '5a566b0690f3dcf4958d5bc8bd329e75',
        apiSecret: 'dd065bd63db2120407e869d2641fc693'
      });
      window.lastFmInit = true;
    }

    FB.init({
      appId      : '1756061591286266',
      xfbml      : true,
      version    : 'v2.1'
    });

    FB.getLoginStatus(function (response) {
        if(response.status === "connected") {
            $scope.isLoggedOnFacebook = true;
            recommendationsService.onFacebookConnected(response.authResponse);
        } else {
            $scope.isLoggedOnFacebook = false;
        }
    });

  }]);
