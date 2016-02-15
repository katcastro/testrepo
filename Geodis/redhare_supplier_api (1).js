

/* ---- GLOBAL VARIABLES ---- */
var log = new Logger(false); //Always include a Logger object. Set parameter to true on Client Side script implementations.
var context = nlapiGetContext(); //Always include an nlobjContext object.

/* ---- ERROR HANDLING CONSTANTS ---- */
var SCRIPT_NAME = 'Redhare API';
var FROM_EMAIL = -5; //Default Administrator
var TO_EMAIL = 'randolf.s.franco@gmail.com';
var CC_EMAILS = null;
var CLIENT_NAME = 'Redhare';
var SCRIPT_FILE_NAME = 'redhare_supplier_api.js';

/* ---- CONSTANTS ---- */

/**
* Replace with Record Type Name/ID for Client and User Event scripts,
* Suitelet Name, RESTlet name, Portlet Name, Scheduled Script Name, and Mass Update Script Name
* for Suitelets, RESTlets, Portlets, Scheduled Scripts and Mass Update Scripts,
* Bundle Name for Bundle Installation scripts, and SSP Application name for SSP and SS.
*/
var RHSupplierApi = {
	
};

/**
 * Insert function description here.
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
RHSupplierApi.doGet = function(dataIn) {
	var operation = dataIn.operation;
	var email = dataIn.email;
	var clientid = dataIn.clientid;
	
	if (StringUtils.isNotEmpty(email))
		email = email.toLowerCase();
	
	var customer = this.validate(email, clientid);
	
	if (customer!=null) {
		log.audit('customer', customer);
		var rhSupplierAPISletURL = nlapiResolveURL('SUITELET', 'customscript_rh_supplier_api_slet', 'customdeploy_rh_supplier_api_slet', true);
		var rhSupplierAPISletResponse = '';
		var response = {};
		
//		Sales Order - DO
//		Item Fulfillment - DO Conf
//		Purchase Order - ASN
//		Item Receipt - ASN Conf
		
		if (operation=='getitems' && StringUtils.isNotEmpty(dataIn.searchid)) {
			rhSupplierAPISletResponse = nlapiRequestURL(rhSupplierAPISletURL + '&operation=getitems&searchid=' + dataIn.searchid);
		}
		else if (operation=='getasn' && StringUtils.isNotEmpty(dataIn.searchid)) {
			rhSupplierAPISletResponse = nlapiRequestURL(rhSupplierAPISletURL + '&operation=getasn&searchid=' + dataIn.searchid);
		}
		else if (operation=='getdo' && StringUtils.isNotEmpty(dataIn.searchid)) { //salesorder
			rhSupplierAPISletResponse = nlapiRequestURL(rhSupplierAPISletURL + '&operation=getdo&searchid=' + dataIn.searchid);
		}
		
		if(StringUtils.isNotEmpty(rhSupplierAPISletResponse))
			response = JSON.parse(rhSupplierAPISletResponse.getBody());
		return response;
	}
	else {
		var response = {
			status: {
				issuccess: false,
				error: 'AUTHENTICATION_ERROR. Invalid Email/Client ID combination. Please contact RH for login.'
			}
		};
		return response;
	}
	
};

/**
 * Insert function description here.
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
RHSupplierApi.doPost = function(dataIn) {
	var operation = dataIn.operation;
	var email = dataIn.email;
	var clientid = dataIn.clientid;
	var customer = this.validate(email, clientid); 
	
	if (customer!=null) {
		var rhSupplierAPISletURL = nlapiResolveURL('SUITELET', 'customscript_rh_supplier_api_slet', 'customdeploy_rh_supplier_api_slet', true);
		var rhSupplierAPISletResponse = '';
		var response = {};
		
		if(operation == 'createasnconf')
			rhSupplierAPISletResponse = nlapiRequestURL(rhSupplierAPISletURL + '&operation=createasnconf&clientid=' + clientid, JSON.stringify(dataIn), {'Content-Type': "text/plain"});
		else if(operation == 'createdoconf')
			rhSupplierAPISletResponse = nlapiRequestURL(rhSupplierAPISletURL + '&operation=createdoconf&clientid=' + clientid, JSON.stringify(dataIn), {'Content-Type': "text/plain"});

		
		if(StringUtils.isNotEmpty(rhSupplierAPISletResponse))
			response = JSON.parse(rhSupplierAPISletResponse.getBody());
		
		return response;
	}
	else {
		var response = {
			status: {
				issuccess: false,
				error: 'AUTHENTICATION_ERROR. Invalid Email/Client ID combination. Please contact RH for login.'
			}
		};
		return response;
	}

};

/**
 * Insert function description here.
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
RHSupplierApi.doPut = function(dataIn) {
	var operation = dataIn.operation;
	log.audit('operation', operation);
	var email = dataIn.email;
	var clientid = dataIn.clientid;
	var customer = this.validate(email, clientid);
	
	
	
	if (customer!=null) {
		var rhSupplierAPISletURL = nlapiResolveURL('SUITELET', 'customscript_rh_supplier_api_slet', 'customdeploy_rh_supplier_api_slet', true);
		var rhSupplierAPISletResponse = '';
		var response = {};
		
		if(operation == 'updatedo')
			rhSupplierAPISletResponse = nlapiRequestURL(rhSupplierAPISletURL + '&operation=updatedo', JSON.stringify(dataIn), {'Content-Type': "text/plain"});
		else if(operation == 'updateasn') {
			log.audit('here');
			rhSupplierAPISletResponse = nlapiRequestURL(rhSupplierAPISletURL + '&operation=updateasn', JSON.stringify(dataIn), {'Content-Type': "text/plain"});
		}
			

		if(StringUtils.isNotEmpty(rhSupplierAPISletResponse))
			response = JSON.parse(rhSupplierAPISletResponse.getBody());
		
		return response;
	}
	else {
		var response = {
			status: {
				issuccess: false,
				error: 'AUTHENTICATION_ERROR. Invalid Email/Client ID combination. Please contact RH for login.'
			}
		};
		return response;
	}
};

RHSupplierApi.validate = function(email, internalid) {
	if (StringUtils.isEmpty(email)) {
		return false;
	}
	if (StringUtils.isEmpty(internalid)) {
		return false;
	}

	var res = nlapiSearchRecord('customer', null,
			[(new nlobjSearchFilter('internalid', null, 'is', internalid)),
			 (new nlobjSearchFilter('email', null, 'is', email))]);
	if (ObjectUtils.isEmpty(res)) {
		res = nlapiSearchRecord('vendor', null,
				[(new nlobjSearchFilter('internalid', null, 'is', internalid)),
				 (new nlobjSearchFilter('email', null, 'is', email))]);
		if (ObjectUtils.isNotEmpty(res)) {
			return res[0].getId();
		};
		return null;
	}
	else {
		return res[0].getId();
	}
	return null;
};


