var _ = require('lodash'),

    dbImages = require('../../../test-db-images');

describe("Formatter", function () {
    var DBFormatter = require('../../../../core/server/utils/formatter'),
        testDBFormatter = new DBFormatter(),

        speciesProps = _.reduce(dbImages, function (collection, dbImage) {
            collection[dbImage.getSpeciesName()] = dbImage.getSpeciesProps();
            return collection;
        }, {}),

        testableSpeciesProps = _.reduce(speciesProps, function (collection, speciesProps, speciesName) {
            collection[speciesName] = _.filter(speciesProps, function (speciesPropData) {
                return speciesPropData.options
                    && (speciesPropData.valType == 'String' || speciesPropData.valType == 'Boolean')
                    && speciesPropData.options.length > 0
            });
            return collection;
        }, {}),

        defaultTestSpeciesName = 'cat',
        defaultSpeciesProps = speciesProps[defaultTestSpeciesName],
        defaultTestProps = testableSpeciesProps[defaultTestSpeciesName],

        testAnimal = {},
        testAnimalWithProps = _.reduce(defaultSpeciesProps, function (collection, propData) {
            var animalPropData = false;
            switch (propData.key) {
                case 'species':
                    // use example because of how data was unfortunately formatted initially
                    animalPropData = _.defaults({val: propData.example.toLowerCase()}, propData)
                    break;
                case 'primaryBreed':
                case 'age':
                case 'sex':
                case 'color':
                    animalPropData = propData;
                    delete animalPropData.val;
            }
            if (animalPropData) {
                collection[animalPropData.key] = animalPropData;
            }
            return collection;
        }, {});

    it("test data is initialized correctly", function () {
        expect(defaultTestProps.length > 3).toBe(true, 'test props should have many fields');
    });

    describe("formatAnimal", function () {

        it("correct creates and formats animal fields", function () {
            var formattedAnimal = testDBFormatter.formatAnimal(defaultSpeciesProps, testAnimal, {
                createMissingFields: true,
                populateEmptyFields: true
            });

            _.forEach(defaultTestProps, function (testPropData) {
                expect(formattedAnimal[testPropData.key].val).not.toBeUndefined();
            });
        });

        it("correct formats pre-created animal fields", function () {
            var formattedAnimal = testDBFormatter.formatAnimal(defaultSpeciesProps, testAnimalWithProps, {
                populateEmptyFields: true
            });

            _.forEach(testAnimalWithProps, function (testAnimalPropVal, testAnimalPropName) {
                expect(formattedAnimal[testAnimalPropName]).not.toBeUndefined(testAnimalPropName + ' should not be undefined');
                expect(formattedAnimal[testAnimalPropName] == null).not.toBe(true, 'values should not equal null');
                expect(formattedAnimal[testAnimalPropName].val).not.toBe(true, 'values should not equal null');
            });
        });
    });

    describe("formatImagesArray", function () {

        it("formats an array of relative urls to absolute urls", function () {
            var testImagesArray = [
                '/some/path/a',
                '/some/path/b',
                '/some/path/c'
            ];
            var formattedTestImagesArray = testDBFormatter.formatImagesArray(testImagesArray);

            _.forEach(formattedTestImagesArray, function (imageURL) {
                expect(imageURL).toMatch(/^http(s)?:\/\//)
            });
        });
    });


    describe("formatDB()", function () {
        var Debuggable = require('../../../../core/lib/debuggable'),
            APIDatabase = require('../../../../core/mongodb'),

            apiDatabase;

        beforeAll(function (done) {
            apiDatabase = new APIDatabase({
                debugLevel: Debuggable.PROD,
                preset: [],
                modelNamePrefix: 'test_formatter_'
            });

            apiDatabase.clearAnimals(function () {
                apiDatabase.uploadDBImages(dbImages, function () {
                    done();
                })
            });
        });

        afterAll(function (done) {
            apiDatabase.clearAnimals(function () {
                apiDatabase.stop(done);
            });
        });

        it("formats an entire database", function (done) {
            testDBFormatter.formatDB(apiDatabase, {
                createMissingFields: true,
                populateEmptyFields: true,
                complete: function () {
                    apiDatabase.findAnimals({}, {
                        complete: function (err, animals) {
                            _.forEach(animals, function (formattedAnimal, index) {
                                _.forEach(testableSpeciesProps[formattedAnimal.species.val], function (testPropData) {
                                    if (!formattedAnimal[testPropData.key]) {
                                        console.log("invalid prop[%s]: %s", index, testPropData.key);
                                    }
                                    expect(formattedAnimal[testPropData.key].val).not.toBeUndefined('value for ' + testPropData.key + 'should be defined');
                                });
                            });
                            done();
                        }
                    })
                }
            });
        })
    })
});