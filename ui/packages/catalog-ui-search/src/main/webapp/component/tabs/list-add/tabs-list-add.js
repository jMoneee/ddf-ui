/**
 * Copyright (c) Codice Foundation
 *
 * This is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details. A copy of the GNU Lesser General Public License is distributed along with this program and can be found at
 * <http://www.gnu.org/licenses/lgpl.html>.
 *
 **/
/*global define*/
const _ = require('underscore');
const Tabs = require('../tabs');
const store = require('js/store');
const IngestDetailsView = require('component/ingest-details/ingest-details.view');
const BuilderView = require('component/builder/builder.view');

module.exports = Tabs.extend({
    defaults: {
        tabs: {
            'Import': IngestDetailsView,
            'Manual': BuilderView
        }
    },
    initialize(options){
    }
});
