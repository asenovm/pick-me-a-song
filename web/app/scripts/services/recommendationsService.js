'use strict';

angular.module('pickMeASong')
    .service('recommendationsService', ['$http', '$q', 'localStorageService', function ($http, $q, $localStorage) {

    var KEY_RECOMMENDED_ITEMS = "recommendedItems";
    var recommendations = [];

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
            recommendations = data;
            $localStorage.set(KEY_RECOMMENDED_ITEMS, recommendations);
            deferred.resolve(data);
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
                recommendedTracksCount: recommendedTracks.length
            }
        }).success(function (data, status, headers, config) {
            console.log('server now knows about the liked tracks');
        }).error(function (data, status, headers, config) {
            console.log('server error - doesnt know about the liked tracks');
        });
    };

}]);
