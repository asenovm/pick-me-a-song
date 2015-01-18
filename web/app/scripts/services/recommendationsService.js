'use strict';

angular.module('pickMeASong')
    .service('recommendationsService', ['$http', '$q', 'localStorageService', function ($http, $q, $localStorage) {

    var KEY_RECOMMENDED_ITEMS = "recommendedItems";
    var KEY_USER_ID = "userId";
    var recommendations = [];
    var userId = $localStorage.get(KEY_USER_ID) || 1;

    this.getRecommendations = function () {
        if(_.isEmpty(recommendations)) {
            return $localStorage.get(KEY_RECOMMENDED_ITEMS);
        }
        return recommendations;
    };

    this.fetchRecommendations = function (artists) {
        var deferred = $q.defer();

        $http({
            url: '/recommendations',
            method: 'GET',
            params: { artists: JSON.stringify(artists) }
        }).success(function (data, status, headers, config) {
            recommendations = data.recommendedTracks;
            userId = data.id;
            $localStorage.set(KEY_USER_ID, userId);
            $localStorage.set(KEY_RECOMMENDED_ITEMS, recommendations);
            deferred.resolve(recommendations);
        }).error(function (data, status, headers, config) {
            $localStorage.set(KEY_RECOMMENDED_ITEMS, []);
            deferred.reject(data);
        });

        return deferred.promise;
    };

    this.likeTrack = function (likedTracks, recommendedTracks) {
        var likedTracksPositions = _.map(likedTracks, function (track) {
            return _.indexOf(recommendedTracks, track);
        });

        $http({
            url: '/like',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: {
                likedTracksPositions: likedTracksPositions,
                recommendedTracksCount: recommendedTracks.length,
                userId: userId
            }
        }).success(function (data, status, headers, config) {
            console.log('server now knows about the liked tracks');
        }).error(function (data, status, headers, config) {
            console.log('server error - doesnt know about the liked tracks');
        });
    };

}]);
