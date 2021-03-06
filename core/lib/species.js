var _ = require('lodash');

/**
 * @class Species
 * @param {String} speciesName
 * @param {Object[]|String} data
 * @constructor
 */
function Species(speciesName, data) {
    var parsedData;
    var parsedProps;

    this.speciesName = speciesName;
    this.baseProps = [
        {
            key: 'petId',
            valType: 'string',
            fieldLabel: "Pet ID",
            example: '',
            defaultVal: [],
            description: 'identifier',
            note: '',
            required: true,
            options: []
        },
        {
            key: 'species',
            valType: 'string',
            fieldLabel: "Animal's Species",
            example: 'dog',
            defaultVal: speciesName,
            description: 'Species of the animal',
            note: '',
            required: true,
            options: [speciesName]
        },
        {
            key: 'images',
            valType: '[image]',
            fieldLabel: "Pet images",
            example: ['http://placehold.it/500x500'],
            defaultVal: [],
            description: 'Images of the animal',
            note: '',
            required: false,
            options: []
        },
        {
            key: 'petName',
            valType: 'string',
            fieldLabel: 'Pet\'s name',
            example: 'Fido',
            defaultVal: '',
            description: 'Pet\'s name',
            note: '',
            required: false,
            options: []
        }
    ];
    this.props = this.baseProps.slice();

    if (data) {
        parsedData = _.isString(data) ? JSON.parse(data) : data;

        if (parsedData.speciesName) {
            this.speciesName = parsedData.speciesName;
        }

        // sanitize props as an array
        parsedProps  = _.reduce(parsedData.props || parsedData, function (collection, propData) {
            if (propData && propData.key) {
                collection.push(propData);
            }
            return collection;
        }, []);

        this.setProps(parsedProps);
    }
}

Species.prototype = {

    /**
     *
     * @returns {String} - name of the species
     */
    getSpeciesName: function () {
        return this.speciesName
    },

    /**
     *
     * @param {Object[]} props - an array of properties to overwrite/insert
     */
    setProps: function (props) {
        var self = this;
        if (!props) {
            console.error('[%o].setProps() received invalid props', this);
            return;
        }
        props.forEach(function (propData) {
            var prevPropIndex = _.findIndex(self.props, {key: propData.key});
            if (prevPropIndex >= 0) {
                self.props[prevPropIndex] = _.defaults({}, propData, self.props[prevPropIndex]);
                return;
            }

            // NOTE Object.assign is to add copy rather than reference of propData
            self.props.push(Object.assign({}, propData));
        });
    },

    /**
     *
     * @param {String|Number} propIndex - key name or index of property to remove
     */
    removeProp: function (propIndex) {
        this.props = _.reject(this.props, function (propData, idx) {
            if (_.isString(propIndex)) {
                return propData.key === propIndex;
            }

            if (_.isNumber(propIndex)) {
                return idx === propIndex;
            }

            return false;
        });
    },

    /**
     *
     * @param {String} propName - key name of the species property
     * @returns {Object} - the specified species property object
     */
    getProp: function (propName) {
        return _.find(this.props, {key: propName});
    },

    /**
     *
     * @param {Object} [options]
     * @param {Boolean} [options.removesValues=false] - whether to remove values from properties
     * @returns {Object[]} - an array containing the animal's properties
     */
    getProps: function (options) {
        var opts = _.defaults(options, {removeValues: false});

        return _.chain(this.props)
            .reduce(function (props, speciesPropData) {
                // fix for bad default location values
                if (speciesPropData.valType === 'location' && !_.isNumber(speciesPropData.defaultVal)) {
                    speciesPropData.defaultVal = -1;
                }

                // remove any duplicate options
                if (speciesPropData.options) {
                    speciesPropData.options = _.chain(speciesPropData.options)
                        .uniq()
                        .sortBy(function (option) {
                            return option
                        })
                        .value()
                }

                props.push(speciesPropData);
                return props
            }, [])
            .map(function (propData) {
                return opts.removeValues ? _.omit(propData, ['val']) : propData;
            })
            .sortBy(function (propData) {
                switch (propData.key) {
                    case 'petId':
                        return 0;
                    case 'images':
                        return 1;
                    case 'petName':
                        return 2;
                    case 'species':
                        return 3;
                    default:
                        return propData.key;
                }
            })
            .value();
    },

    getSpeciesProps: function () {
        return this.getProps({removeValues: true});
    },

    /**
     *
     * @param {Object} [options]
     * @param {Boolean} [options.removesValues=false] - whether to remove values from properties
     * @returns {{speciesName: (String), props: (Object[])}} - an object formatted for saving in mongodb
     */
    toMongooseDoc: function (options) {
        return {
            speciesName: this.getSpeciesName(),
            props: this.getProps(options)
        }
    }
};

module.exports = Species;
