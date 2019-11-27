/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

/**set port using env variable for server */
 var port = process.env.PORT || 3000;
	app.listen(port, "0.0.0.0", function () {
		console.log("Listening on --- Port 3000");
});


/** start connection  from servicenow*/
const sn = require('servicenow-rest-api');
const ServiceNow = new sn('dev54863', 'indus_user', 'Demo*123');

/** end connection  from servicenow*/

/**pass incoming webhook to send messege to slack from azure */
var MY_SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";
var slack = require('slack-notify')(MY_SLACK_WEBHOOK_URL);


///////////////////////////////////////////
//     API for connection from servicenow ticket//
///////////////////////////////////////////
app.post('/snow', function (req, response) {
 
		console.log("Display name ", req.body.queryResult.intent.displayName);
        switch (req.body.queryResult.intent.displayName) {			      		  
			
		/**Create new ticket in service now */
        case "createnewticketservicenow":
            var sort_desc = (req.body.queryResult.parameters.sort_description).toString();
            const data = {
                'short_description': (req.body.queryResult.parameters.sort_description).toString(),
                'urgency': (req.body.queryResult.parameters.urgency).toString(),
                'assignment_group': 'Hardware'
            };
            ServiceNow.createNewTask(data, 'incident', res => {
                console.log(JSON.stringify({ "fulfillmentText": "Your ticket " + res.number + " is created successfully with status: " + res.state + " and description: " + res.short_description }));
                response.send(JSON.stringify({ "fulfillmentText": "Your ticket " + res.number + " is created successfully with status: " + res.state + " and description: " + res.short_description }));
            });

            break;
		/**Getting ticket details from service now */
        case "getServiceNowTkt":
            response.setHeader('Content-Type', 'application/json');
			var tktnumber = (req.body.queryResult.parameters.tktnumber).toString();			
            const fields = [
                'number',
                'short_description',
                'assignment_group',
                'priority',
                'incident_state'
            ];
            const filters = [
                'number=' +req.body.queryResult.parameters.tktnumber.toString()
            ];
			
            ServiceNow.getTableData(fields, filters, 'incident', res => {
              console.log("hii",res)				
                console.log(JSON.stringify({ "fulfillmentText": "Ticketnumber: " + res[0].number + " status is " + res[0].incident_state + " and description : " + res[0].short_description }));
                response.send(JSON.stringify({ "fulfillmentText": "Ticketnumber:  " + res[0].number + " status is " + res[0].incident_state + " and description : " + res[0].short_description }));
            });
            break;
			/**Getting ticket urgency from service now */
			 case "geturgencyofticket":
				response.setHeader('Content-Type', 'application/json');
				const fieldsarray = [
					'number',
					'urgency'             
				];
				const filtersarray = [
					'number=' + req.body.queryResult.parameters.ticketnumber
				];
            ServiceNow.getTableData(fieldsarray, filtersarray, 'incident', res => {
                console.log("data is here", res);
                var result = res[0].urgency;
                var data = result.split("-", -1);
                var urgencydata = data[1];
                console.log(JSON.stringify({ "fulfillmentText": "Ticketnumber: " + res[0].number + " urgeny is " +urgencydata }));
                response.send(JSON.stringify({ "fulfillmentText": "Ticketnumber: " + res[0].number + " urgeny is " +urgencydata }));
            });
            break;
			    break;
        /**Update ticket status in service now */
        case "updateservicenowticket":
            var status = (req.body.queryResult.parameters.ticket_status).toString();
		     var ticketnuber = (req.body.queryResult.parameters.ticket_number).toString();			  
            /**change status in first charater in uppercase */
            function toTitleCase(str) {
                return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
            }
			
            var newstatus = toTitleCase(status);
				console.log("hii",newstatus)
            const updatedata = {
                'incident_state': newstatus
            };
            ServiceNow.UpdateTask('incident',ticketnuber,updatedata, res => {
                response.setHeader("Content-Type", "application/json");
				response.send(JSON.stringify({ "fulfillmentText": "Your ticket number: " + ticketnuber + " is updated successfully with status " + newstatus }));
            });
            break;
		/**update ticket urgency in service now */
        case "updateticketurgency":
            var geturgency = (req.body.queryResult.parameters.urgency).toString();
            console.log("urgency",geturgency );
            if (geturgency == "low" || geturgency == "Low") {
                var urgencydata = 3;
                var impactdata = 3;
            } else if (geturgency == "high" || geturgency == "High") {
                var urgencydata = 1;
                var impactdata = 1;
            } else if (geturgency == "medium" || geturgency == "Medium") {
                var urgencydata = 2;
                var impactdata = 2;
            }
            var gettknumber = req.body.queryResult.parameters.tktnumber.toString()
            const incidentData = {
                'work_notes': 'Elevating priority of ticket as per business request',
                'urgency': urgencydata,
                'impact': impactdata
            };
            ServiceNow.UpdateTask('incident',gettknumber, incidentData, res => {
                //console.log(res);
                response.send(JSON.stringify({ "fulfillmentText": "Your ticket number: " + ticketnuber + " is updated successfully with urgency " + geturgency }));
            }); 
            break;
			 case "tktlist":
            const fieldsdata = [
                'number',
                'short_description',
                'assignment_group',
                'assigned_to',
                'urgency',
				'incident_state'
            ];
            const filtersdata = [
                //'priority=1',
                //'risk=High',
                'incident_state=2',
                //'opened_atONLast 6 months@javascript:gs.beginningOfLast6Months()@javascript:gs.endOfLast6Months()' //Opened on last 6 months
            ];

            ServiceNow.getTableData(fieldsdata, filtersdata, 'incident', res => {
				console.log("data", res)
				response.setHeader('Content-Type', 'text/plain');
                for (var i = 0; i < res.length; i++) {
                 console.log("data is here", res[i].number +"  && urgency is "+ res[i].incident_state);
				 slack.send({				  
						channel: 'azure',
						text:  'Ticket Number '+res[i].number + " status is " +res[i].incident_state 
					});  
                // response.send(JSON.stringify({ "fulfillmentText": "Ticket number: " + res[i].number + " and urgency " + res[i].urgency +"/ n"}));
				response.write(JSON.stringify({ "fulfillmentText": "Ticket number: " + res[i].number + " and urgency " + res[i].urgency +"/ n"}));
                }
				response.end();

            });
            break;
			
			/**Create new ticket in service now by rebbot command */
        case "rebootserver":
		
		const getdata={
			'short_description':'Reboot Server!!',
			'urgency':'1',
			'priority':'1',
			'assignment_group':'Hardware'
			};

		ServiceNow.createNewTask(getdata,'incident',res=>{
			console.log(res);
			response.send(JSON.stringify({ "fulfillmentText": "For reboot ticket is created please check on service now" }));
		});
            
			

            break;
			

        }
     
});

