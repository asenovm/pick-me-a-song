'use strict';

angular.module('pickMeASong')
  .controller('RecommendationsController', ['$scope', 'recommendationsService', function ($scope, recommendationsService) {

    $scope.recommendations = recommendationsService.getRecommendations();

    $scope.onLikeClicked = function (track, $event) {
        var $target = $(event.target),
            likedTracks = _.filter($scope.recommendations, function (track) {
                return track.liked;
            });

        if($target.hasClass('btn-warning')) {
            track.liked = false;
            $target.removeClass('btn-warning').addClass('btn-success').button('default');    
        } else {
            track.liked = true;
            likedTracks.push(track);
            recommendationsService.likeTrack(likedTracks, $scope.recommendations);
            $target.addClass('btn-warning').removeClass('btn-success').button('liked');
        }

        recommendationsService.saveRecommendations();
    };

  }]);
