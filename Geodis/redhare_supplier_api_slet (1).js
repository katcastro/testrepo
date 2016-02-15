
/*
 * Author: Randolf Franco - randolf.s.franco@gmail.com
 * Date: 04 Oct 2014
 */

/* ---- GLOBAL VARIABLES ---- */
var log = new Logger(false); //Always include a Logger object. Set parameter to true on Client Side script implementations.
var context = nlapiGetContext(); //Always include an nlobjContext object.

/* ---- ERROR HANDLING CONSTANTS ---- */
var SCRIPT_NAME = 'Redhare Supplier API SLET';
var FROM_EMAIL = -5; //Default Administrator
var TO_EMAIL = 'randolf.s.franco@gmail.com';
var CC_EMAILS = null;
var CLIENT_NAME = 'Redhare';
var SCRIPT_FILE_NAME = 'redhare_supplier_api_slet.js';

var RHSupplierApiSLET = {
	response: {
		status: {
			issuccess: true,
			error: ''
		}
	}
};

RHSupplierApiSLET.main = function(request, response) {
	try {
		if (request.getMethod() == 'GET')
			this.doGet(request, response);
		else if(request.getMethod() == 'POST')
			this.doPost(request, response);
	}
	catch (e) {
		var errorMessage = 'Redhare Supplier API SLET Unexpected Error';
		logEmailError('main - ' + errorMessage, e);
		this.response.status.issuccess = false;
		
		if(e instanceof nlobjError || typeof e === nlobjError)
			this.response.status.error = e.getCode() + ' ' + e.getDetails();
		else if (!(e instanceof nlobjError || typeof e === nlobjError))
			this.response.status.error = e.message;
	}
	
	response.setContentType('PLAINTEXT');
	response.setEncoding('UTF-8');
	log.audit('response', JSON.stringify(this.response));
	response.write(JSON.stringify(this.response));
};

RHSupplierApiSLET.doGet = function(request, response) {
	this.doPost(request, response);
};

RHSupplierApiSLET.doPost = function(request, response) {
	var operation = request.getParameter('operation');
	var searchid = request.getParameter('searchid');
	var clientid = request.getParameter('clientid');
	var transactionids = [];
	
	if(operation == 'getitems' && StringUtils.isNotEmpty(searchid)) {
		this.response.item = RedhareSupplierAPILib.getResults('item', searchid);
	}
	else if(operation == 'getasn' && StringUtils.isNotEmpty(searchid)) {
		this.response.transaction = RedhareSupplierAPILib.getResults('transaction', searchid);
	}
	else if(operation == 'getdo' && StringUtils.isNotEmpty(searchid)) {
		this.response.transaction = RedhareSupplierAPILib.getResults('transaction', searchid);
	}
	else if(operation == 'createasnconf') {
		transactionids = RedhareSupplierAPILib.createItemReceipts(JSON.parse(request.getBody(), clientid));
		var grouped = _.groupBy(RedhareSupplierAPILib.viewTransactionDetails(transactionids, 'itemreceipt', 188), 'tranid'); //FLO
		log.audit('grouped', JSON.stringify(grouped));
		this.response.transaction = grouped;
	}
	else if(operation == 'createdoconf') {
		transactionids = RedhareSupplierAPILib.createItemFulfillments(JSON.parse(request.getBody(), clientid));
		log.audit('transactionids', JSON.stringify(transactionids));
		this.response.transaction = RedhareSupplierAPILib.viewTransactionDetails(transactionids.transactions, 'itemfulfillment', 454);
		if (ObjectUtils.isNotEmpty(transactionids.errors)) {
			this.response.error = transactionids.errors;	
		}
		
	}
	else if(operation == 'updatedo') {
		transactionids = RedhareSupplierAPILib.updateDO(JSON.parse(request.getBody()));
		this.response.transaction = RedhareSupplierAPILib.viewTransactionDetails(transactionids, 'salesorder', 250); //RH Supplier: Sales Orders
	}
	else if(operation == 'updateasn') {
		transactionids = RedhareSupplierAPILib.updateASN(JSON.parse(request.getBody()));
		log.audit('transactionids', transactionids);
		this.response.transaction = RedhareSupplierAPILib.viewTransactionDetails(transactionids, 'purchaseorder', 251); //RH Supplier: Purchase Orders
	};



};