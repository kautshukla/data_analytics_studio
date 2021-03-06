/*
 *
 * HORTONWORKS DATAPLANE SERVICE AND ITS CONSTITUENT SERVICES
 *
 * (c) 2016-2018 Hortonworks, Inc. All rights reserved.
 *
 * This code is provided to you pursuant to your written agreement with Hortonworks, which may be the terms of the
 * Affero General Public License version 3 (AGPLv3), or pursuant to a written agreement with a third party authorized
 * to distribute this code.  If you do not have a written agreement with Hortonworks or with an authorized and
 * properly licensed third party, you do not have any rights to this code.
 *
 * If this code is provided to you under the terms of the AGPLv3:
 * (A) HORTONWORKS PROVIDES THIS CODE TO YOU WITHOUT WARRANTIES OF ANY KIND;
 * (B) HORTONWORKS DISCLAIMS ANY AND ALL EXPRESS AND IMPLIED WARRANTIES WITH RESPECT TO THIS CODE, INCLUDING BUT NOT
 *   LIMITED TO IMPLIED WARRANTIES OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE;
 * (C) HORTONWORKS IS NOT LIABLE TO YOU, AND WILL NOT DEFEND, INDEMNIFY, OR HOLD YOU HARMLESS FOR ANY CLAIMS ARISING
 *   FROM OR RELATED TO THE CODE; AND
 * (D) WITH RESPECT TO YOUR EXERCISE OF ANY RIGHTS GRANTED TO YOU FOR THE CODE, HORTONWORKS IS NOT LIABLE FOR ANY
 *   DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE OR CONSEQUENTIAL DAMAGES INCLUDING, BUT NOT LIMITED TO,
 *   DAMAGES RELATED TO LOST REVENUE, LOST PROFITS, LOSS OF INCOME, LOSS OF BUSINESS ADVANTAGE OR UNAVAILABILITY,
 *   OR LOSS OR CORRUPTION OF DATA.
 *
 */

import Ember from 'ember';
import tabs from '../../../../configs/table-level-tabs';
import UILoggerMixin from '../../../../mixins/ui-logger';
import commons from '../../../../mixins/commons';


export default Ember.Route.extend(UILoggerMixin, commons, {
  breadCrumb: {
    title: 'Table'
  },
  tableOperations: Ember.inject.service(),
  model(params) {
    let database = this.modelFor('databases.database').get('name');
    let table = params.name;
    return this.store.queryRecord('tableInfo', {databaseId: database, tableName: table});
  },

  setupController: function (controller, model) {
    this._super(controller, model);
    this.logGA('TABLES');
    let newTabs = Ember.copy(tabs);
    if (Ember.isEmpty(model.get('partitionInfo'))) {
      newTabs = newTabs.rejectBy('name', 'partitions');
    }
    controller.set('dbName', this.modelFor('databases.database').get('name'));
    console.log(model.get('detailedInfo.tableType').toLowerCase());
    if (model.get('detailedInfo.tableType').toLowerCase().indexOf('view') === -1) {
      newTabs = newTabs.rejectBy('name', 'viewInfo');
    } else {
      newTabs = newTabs.rejectBy('name', 'viewInfo'); /* There is no back-end avaiable yet for view info. Hence,hinding the view info tab.  */
      newTabs = newTabs.rejectBy('name', 'statistics');
    }
    controller.set('tabs', newTabs);
  },

  actions: {
    deleteTable() {
      this.logGA('TABLE_DELETE');
      this.deleteTable(this.currentModel);
    },

    deleteTableWarning(){
      this.deleteTableWarning();
    },

    cancelDeleteTableWarning(){
      this.cancelDeleteTableWarning();
    },

    editTable(table) {
      console.log("Edit table");
    },

    refreshTableInfo() {
      this.refresh();
    }
  },

  deleteTableWarning(){
    this.controller.set('showDeleteTableWarningModal', true);
  },

  cancelDeleteTableWarning(){
    this.controller.set('showDeleteTableWarningModal', false);
  },

  deleteTable(tableInfo) {
    this.controller.set('showDeleteTableWarningModal', false);
    this.controller.set('showDeleteTableModal', true);
    this.controller.set('deleteTableMessage', 'Submitting request to delete table');
    let databaseModel = this.controllerFor('databases.database').get('model');
    this.get('tableOperations').deleteTable(databaseModel.get('name'), tableInfo.get('table'))
      .then((job) => {
        this.controller.set('deleteTableMessage', 'Waiting for the table to be deleted');
        this.get('tableOperations').waitForJobToComplete(job.get('id'), 5 * 1000)
          .then((status) => {
            this.controller.set('deleteTableMessage', "Successfully Deleted table");
            this.get('logger').success(`Successfully deleted table '${tableInfo.get('table')}'`);
            Ember.run.later(() => {
              this.controller.set('showDeleteTableModal', false);
              this.controller.set('deleteTableMessage');
              //this._removeTableLocally(databaseModel.get('name'), tableInfo.get('table'));
              //this._resetModelInTablesController(databaseModel.get('name'), tableInfo.get('table'));
              this.transitionTo('databases.database', databaseModel.get('name'));
            }, 2 * 1000);
          }, (error) => {
            this.get('logger').danger(`Failed to delete table '${tableInfo.get('table')}'`, this.extractError(error));
            Ember.run.later(() => {
              this.controller.set('showDeleteTableModal', false);
              this.controller.set('deleteTableMessage');
              this.transitionTo('databases.database', databaseModel.get('name'));
            }, 2 * 1000);
          });
      }, (error) => {
        this.get('logger').danger(`Failed to delete table '${tableInfo.get('table')}'`, this.extractError(error));
        this.controller.set('showDeleteTableModal', true);
      });

  },

  _removeTableLocally(database, table) {
    let tableToBeRemoved = this.store.peekRecord('table', `${database}/${table}`);
    this.store.deleteRecord(tableToBeRemoved);
  },

  _resetModelInTablesController(database, tables) {
    let tablesController = this.controllerFor('databases.database.tables');
    let currentTables = this.store.peekRecord('database', database).get('tables');
    tablesController.set('model', currentTables);
  }
});
