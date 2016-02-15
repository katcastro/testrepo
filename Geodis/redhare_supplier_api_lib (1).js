var DEFAULT = {
		"location" : "1"
};
var RedhareSupplierAPILib = {
		removeNulls : function(obj) {
			
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					if ((obj[key])==null) {
						obj[key] = '';
					}
				}
			};
			return obj;
		},
		getPOInternalId: function(tranid) {
			if (StringUtils.isEmpty(tranid)) return null;
			var filters = [];
			filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
			var res = nlapiSearchRecord('purchaseorder', null, filters);
			if (ObjectUtils.isNotEmpty(res)) {
				return res[0].getId();
			}
			return null;
		},
		getSOInternalId: function(tranid) {
			if (StringUtils.isEmpty(tranid)) return null;
			var filters = [];
			filters.push(new nlobjSearchFilter('tranid', null, 'is', tranid));
			var res = nlapiSearchRecord('salesorder', null, filters);
			if (ObjectUtils.isNotEmpty(res)) {
				return res[0].getId();
			}
			return null;
		},
		getResults : function(recordType, searchId) {
			var resultsJSON = [];
			var results = nlapiSearchRecord(recordType, searchId);
			
			if (ObjectUtils.isNotEmpty(results)) {
				resultsJSON = this.retrieveJSON(results[0].getAllColumns(), results);
				log.audit('resultsJSON', JSON.stringify(resultsJSON));
			};

			return resultsJSON;
		},
		getColumnsJSON : function(columns) {
			var columnsArr = [];
			for (var i = 0; i < columns.length; i++) {
				var column = columns[i];
				columnsArr.push({
					'internalid': column.getName(),
					'label': column.getLabel() || column.getName(),
			        'column': column
				});
			}
			return columnsArr;
		},
		retrieveJSON : function(columns, searchRes) {
			var json = [];
			var columnsArr = this.getColumnsJSON(columns);
			
			for (var i = 0; i < searchRes.length; i++) {
				var item = {};
				for (var j = 0; j < columnsArr.length; j++) {
					item[columnsArr[j]['label']] = searchRes[i].getValue(columns[j]);
				}
				json.push(item);
			}
			return json;
		},
		createItemReceipts: function(itemReceiptDetails, clientid) {
			var transactionIds = [];
			
			for (var i=0; i<itemReceiptDetails.itemreceipts.length; i++) {
				var ir = itemReceiptDetails.itemreceipts[i];
				try {
					var poId = this.getPOInternalId(ir.ponumber);
					if (StringUtils.isEmpty(poId)) {
						log.error('poId not found for ponumber', ir.ponumber);
						continue;
					}
					var irRecord = nlapiTransformRecord('purchaseorder', poId, 'itemreceipt');
					irRecord.setFieldValue('trandate', ir.trandate);
					irRecord.setFieldValue('tranid', ir.ponumber);
					//irRecord.setFieldValue('entity', ir.entity);
					
					if(ObjectUtils.isNotEmpty(ir.items)) {
						for(var i = 0, ilen = ir.items.length; i < ilen; i++) {
							var itemId = ir.items[i].itemid;
							for (var j=1; j<=irRecord.getLineItemCount('item'); j++) {
								var itemText = nlapiLookupField('item', irRecord.getLineItemValue('item', 'item', j), 'itemid');
								if (itemId==itemText) {
									irRecord.setLineItemValue('item', 'itemreceive', j, 'T');
									irRecord.setLineItemValue('item', 'location', j, DEFAULT.location); //location = fulfillment
									irRecord.setLineItemValue('item', 'quantity', j, ir.items[i].quantity);
								}
							}
						}
					}
					irRecord.setFieldValue('memo', ir.memo);
					var id = nlapiSubmitRecord(irRecord, true, true);
					transactionIds.push(id);
				}
				catch (e) {
					log.error('Error creating item receipt for item ' +  ir.ponumber, e.message);
				};
			}
			log.audit('transactionIds', JSON.stringify(transactionIds));
			return transactionIds;
		},
		createItemFulfillments: function(itemFulfillmentDetails, clientid) {
			var transactionIds = [];
			var errors = [];
			
			for (var i=0; i<itemFulfillmentDetails.itemfulfillments.length; i++) {
				var ir = itemFulfillmentDetails.itemfulfillments[i];
				try {
					var soId = this.getSOInternalId(ir.sonumber);
					if (StringUtils.isEmpty(soId)) {
						log.audit('soId not found for sonumber', ir.sonumber);
						continue;
					}
					var irRecord = nlapiTransformRecord('salesorder', soId, 'itemfulfillment');
					irRecord.setFieldValue('trandate', ir.trandate);
					irRecord.setFieldValue('tranid', ir.sonumber);
					//irRecord.setFieldValue('entity', ir.entity);
					
					if(ObjectUtils.isNotEmpty(ir.items)) {
						for(var i = 0, ilen = ir.items.length; i < ilen; i++) {
							var itemId = ir.items[i].itemid;
							for (var j=1; j<=irRecord.getLineItemCount('item'); j++) {
								var itemText = nlapiLookupField('item', irRecord.getLineItemValue('item', 'item', j), 'itemid');
								if (itemId==itemText) {
									log.audit('ir.items[i].quantity', ir.items[i].quantity);
									irRecord.setLineItemValue('item', 'itemreceive', j, 'T');
									irRecord.setLineItemValue('item', 'location', j, DEFAULT.location); //location = fulfillment
									irRecord.setLineItemValue('item', 'quantity', j, ir.items[i].quantity);
								}
							}
						}
					}
					irRecord.setFieldValue('memo', ir.memo);
					var id = nlapiSubmitRecord(irRecord, true, true);
					transactionIds.push(id);
				}
				catch (e) {
					log.error('Error creating item fulfillment for item ' +  ir.ponumber, e.message);
					errors.push({'ponumber' : ir.ponumber,
						'message' : e.message});
				};
			}
			log.audit('transactionIds', JSON.stringify(transactionIds));
			var obj = {"transactions" : transactionIds,
					   "errors" : errors};
			return obj;
			//return transactionIds;
		},
		viewTransactionDetails: function(transactionIds, recordType, searchId) {
			if (ObjectUtils.isEmpty(transactionIds)) return {};
			if (StringUtils.isEmpty(searchId)) return {};
			log.audit('transactionids-', JSON.stringify(transactionIds));
			var filters = [];
			filters.push(new nlobjSearchFilter('internalid', null, 'anyof', transactionIds));
			//filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
			
			var txnResults = nlapiSearchRecord(recordType, searchId, filters);
			if (ObjectUtils.isEmpty(txnResults)) return {};
			log.audit('txnResults', txnResults.length);
			var columnsArr = this.getColumnsJSON(txnResults[0].getAllColumns());
			var txns = [];
			
			for (var i=0; i<txnResults.length; i++) {
				var txnJSON = {};
				for (var j=0; j<columnsArr.length; j++) {
					txnJSON[columnsArr[j]['label']] = txnResults[i].getValue(columnsArr[j]['column']);
				}
				txns.push(txnJSON);
			}
			return txns;
		},
		updateDO: function(salesOrderDetails) {
			if (ObjectUtils.isEmpty(salesOrderDetails)) return {};
			log.audit('salesOrderDetails', JSON.stringify(salesOrderDetails));
			
			var filters = [];
			var filterExpr = [];
			for (var i=0; i<salesOrderDetails.salesorders.length; i++) {
				filterExpr.push(['tranid','is',salesOrderDetails.salesorders[i]]);
				if (i!=(salesOrderDetails.salesorders.length-1)) {
					filterExpr.push('OR');	
				}
			}
			filters.push(filterExpr);
			filters.push('AND');
			filters.push(['mainline', 'is', 'T']);
			
			var res = nlapiSearchRecord('salesorder', null, filters);
			
			var ids = [];
			if (ObjectUtils.isNotEmpty(res)) {
				for (var i=0; i<res.length; i++) {
					nlapiSubmitField('salesorder', res[i].getId(), 'custbody_do_acknowledge', 'T');
					log.audit('Updated SO', res[i].getId());
					ids.push(res[i].getId());
				}
			}
			return ids;
		},
		updateASN: function(purchaseOrderDetails) {
			if (ObjectUtils.isEmpty(purchaseOrderDetails)) return {};
			log.audit('purchaseOrderDetails', JSON.stringify(purchaseOrderDetails));
			
			var filters = [];
			var filterExpr = [];
			for (var i=0; i<purchaseOrderDetails.purchaseorders.length; i++) {
				filterExpr.push(['tranid','is',purchaseOrderDetails.purchaseorders[i]]);
				if (i!=(purchaseOrderDetails.purchaseorders.length-1)) {
					filterExpr.push('OR');	
				}
			}
			filters.push(filterExpr);
			filters.push('AND');
			filters.push(['mainline', 'is', 'T']);
			
			var res = nlapiSearchRecord('purchaseorder', null, filters);
			
			var ids = [];
			if (ObjectUtils.isNotEmpty(res)) {
				for (var i=0; i<res.length; i++) {
					nlapiSubmitField('purchaseorder', res[i].getId(), 'custbody_asn_acknowledge', 'T');
					log.audit('Updated PO', res[i].getId());
					ids.push(res[i].getId());
				}
			}
			return ids;
		},
		
};


