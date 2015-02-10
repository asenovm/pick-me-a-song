'use strict';

angular.module('pickMeASong')
    .service('recommendationsService', ['$http', '$q', 'localStorageService', function ($http, $q, $localStorage) {

    var SCORE_ARTIST_DEFAULT = 5;
    var KEY_RECOMMENDED_ITEMS = 'recommendedItems';
    var KEY_USER_ID = 'userId';
    var KEY_TRACKS_TO_RATE = 'tracksToRate';
    var KEY_NEIGHBOURS_COUNT = 'neighboursCount';
    var KEY_COLLABORATIVE_FILTERING_USED = 'collaborativeFilteringUsed';
    var KEY_ARTISTS_USED = 'artistsUsed';
    var recommendations = $localStorage.get(KEY_RECOMMENDED_ITEMS) || [];
    var userId = $localStorage.get(KEY_USER_ID) || 1;
    var tracksToRate = $localStorage.get(KEY_TRACKS_TO_RATE) || [];
    var LIMIT_COUNT_ARTISTS = 15;

    this.getRecommendations = function () {
        return recommendations;
    };

    this.saveRecommendations = function (items) {
        recommendations = items || recommendations;
        $localStorage.set(KEY_RECOMMENDED_ITEMS, recommendations);
    };

    this.saveUserId = function (id) {
        userId = id;
        $localStorage.set(KEY_USER_ID, id);
    };

    this.fetchRecommendations = function (artists, ratedTracks, likedTracks, recommendedTracks) {
        var likedTracksPositions = _.map(likedTracks, function (track) {
                return _.indexOf(recommendedTracks, track);
            }), deferred = $q.defer(),
            tracks = _.map(ratedTracks, function (track) {
                return {
                    name: track.name,
                    score: track.userValue
                };
            }),
            that = this;

        $http({
            url: '/recommendations',
            method: 'POST',
            data: {
                userProfile: {
                    artists: artists,
                    tracks: tracks,
                    name: Date.now()
                },
                options: {
                    neighboursCount: $localStorage.get(KEY_NEIGHBOURS_COUNT),
                    algorithmType: that.getCollaborativeFilteringUsed() ? 'collaborativeFiltering' : 'contentFiltering',
                    metricType: that.getArtistsUsed() ? 'artists' : 'tracks'
                },
                likedTracksPositions: likedTracksPositions,
                recommendedTracks: recommendedTracks,
                userId: userId
            }
        }).success(function (data, status, headers, config) {
            if(_.isEmpty(data.recommendedTracks)) {
                that.fetchDefaultRecommendations(function () {
                    deferred.resolve(recommendations);
                });
            } else {
                that.saveRecommendations(data.recommendedTracks);
                deferred.resolve(recommendations);
            }
        }).error(function (data, status, headers, config) {
            that.fetchDefaultRecommendations(function () {
                deferred.reject(recommendations);
            });
        });

        return deferred.promise;
    };

    this.onFacebookLogin = function (loginSuccessfulCallback, recommendationsFetchedCallback) {
        var that = this;
        return function (response) {
            if(response.status === "connected") {
                loginSuccessfulCallback();
                that.saveUserId(response.authResponse.userID);
                that.fetchInfoFromFacebook(recommendationsFetchedCallback);
            }
        };
    };

    this.fetchInfoFromFacebook = function (recommendationsFetchedCallback) {
        var that = this;
        FB.api('/me/music?limit=' + LIMIT_COUNT_ARTISTS, function (response) {
            var likes = _.map(response.data, function (artist) {
                return {
                    name: artist.name,
                    score: SCORE_ARTIST_DEFAULT
                };
            });
            that.fetchRecommendations(likes, [], [], []).finally(recommendationsFetchedCallback);
        });
    };

    this.fetchInfoFromLastFm = function (user, recommendationsFetchedCallback) {
        var that = this;
        lastFm.user.getInfo({ user: user }, {
            success: function (data) {
                that.saveUserId(data.user.id);
                lastFm.user.getTopArtists({ user: user, limit: LIMIT_COUNT_ARTISTS }, {
                    success: function (data) {
                        var artists = _.map(data.topartists.artist, function (artist) {
                            return {
                                name: artist.name,
                                score: artist.playcount
                            };
                        });
                        lastFm.user.getTopTracks({ user: user, limit: LIMIT_COUNT_ARTISTS }, {
                            success: function (data) {
                                that.fetchRecommendations(artists, data.toptracks.track, [], []).finally(recommendationsFetchedCallback);
                            }, error: function (code, message) {
                                that.fetchRecommendations(artists, [], [], []).finally(recommendationsFetchedCallback);
                            }
                        });
                    }, error: function (code, message) {
                        that.fetchRecommendations([], [], [], []).finally(recommendationsFetchedCallback);
                    }
                });
            },
            error: function (code, message) {
                that.saveUserId("client-generated-" + Date.now());
                that.fetchRecommendations([], [], [], []).finally(recommendationsFetchedCallback);
            }
        });
    };

    this.fetchDefaultRecommendations = function (callback) {
        var that = this;
        this.fetchTracksToRate(function (result) {
            that.saveUserId(result.userId);
            that.saveRecommendations(result.tracks);
            callback();
        });
    };

    this.onFacebookConnected = function (authInfo) {
        userId = authInfo.userID;
    };

    this.fetchTracksToRate = function (callback) {
        var that = this;

        $http({
            url: '/tracksToRate',
            method: 'GET'
        }).success(function (data, status, headers, config) {
            callback(data);
            tracksToRate = data.tracks;
            $localStorage.set(KEY_TRACKS_TO_RATE, tracksToRate);
            that.saveUserId(data.userId);
        }).error(function (data, status, headers, config) {
            callback([]);
        });
    };

    this.getTracksToRate = function () {
        return tracksToRate;
    };

    this.setNeighboursCount = function (count) {
        $localStorage.set(KEY_NEIGHBOURS_COUNT, count);
    };

    this.setCollaborativeFilteringUsed = function (value) {
        $localStorage.set(KEY_COLLABORATIVE_FILTERING_USED, value);
    };

    this.setArtistsUsed = function (value) {
        $localStorage.set(KEY_ARTISTS_USED, value);
    };

    this.getCollaborativeFilteringUsed = function () {
        return this._getFromLocalStorage(KEY_COLLABORATIVE_FILTERING_USED);
    };

    this.getArtistsUsed = function () {
        return this._getFromLocalStorage(KEY_ARTISTS_USED);
    };

    this._getFromLocalStorage = function (key) {
        var localStorageInfo = $localStorage.get(key);
        if(_.isUndefined(localStorageInfo) || _.isNull(localStorageInfo)) {
            return true;
        }
        return JSON.parse(localStorageInfo);
    }

}]);
