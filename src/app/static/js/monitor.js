var data_memcpu;
var data_disk;
var data_net;

var chart_memcpu;
var chart_disk;
var chart_net;

var options_percent;
var options_io;

var refresh_sec = 3.0;

var proc_timer;
var chart_timer;
var service_timer;
var network_timer;
var health_timer;


// =========================================================
// INITIALIZE DASHBOARD
// =========================================================

function initCharts() {

   data_memcpu = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['CPU', 0],
      ['Memory', 0]
   ]);

   data_disk = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['Disk read', 0],
      ['Disk write', 0]
   ]);

   data_net = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['Net sent', 0],
      ['Net recv', 0]
   ]);


   options_percent = {
      redFrom: 90,
      redTo: 100,

      yellowFrom: 75,
      yellowTo: 90,

      greenFrom: 0,
      greenTo: 75,

      minorTicks: 5,

      animation: {
         duration: 950,
         easing: 'inAndOut'
      }
   };


   options_io = {
      max: 200,

      minorTicks: 10,

      animation: {
         duration: 950,
         easing: 'inAndOut'
      }
   };


   chart_memcpu =
      new google.visualization.Gauge(
         document.getElementById('chart1')
      );

   chart_disk =
      new google.visualization.Gauge(
         document.getElementById('chart2')
      );

   chart_net =
      new google.visualization.Gauge(
         document.getElementById('chart3')
      );


   // Initial dashboard data
   refreshCharts();
   refreshProcesses();
   refreshServices();
   refreshNetwork();
   refreshHealth();


   // Default refresh rate
   setRefresh(refresh_sec);

   $('#refrate').text(refresh_sec);
   $('#refslider').val(refresh_sec);


   $(document).on(
      'input',
      '#refslider',
      function() {

         setRefresh($(this).val());

      }
   );
}


// =========================================================
// REFRESH TIMER
// =========================================================

function setRefresh(new_secs) {

   refresh_sec = parseFloat(new_secs);

   $('#refrate').text(refresh_sec);


   clearInterval(proc_timer);
   clearInterval(chart_timer);
   clearInterval(service_timer);
   clearInterval(network_timer);
   clearInterval(health_timer);


   proc_timer = setInterval(
      function() {

         refreshProcesses();

      },
      refresh_sec * 1000
   );


   chart_timer = setInterval(
      function() {

         refreshCharts();

      },
      refresh_sec * 1000
   );


   service_timer = setInterval(
      function() {

         refreshServices();

      },
      refresh_sec * 1000
   );


   network_timer = setInterval(
      function() {

         refreshNetwork();

      },
      refresh_sec * 1000
   );


   health_timer = setInterval(
      function() {

         refreshHealth();

      },
      refresh_sec * 1000
   );
}


// =========================================================
// SYSTEM HEALTH
// =========================================================

function refreshHealth() {

   $.ajax({

      url: '/api/health',

      type: 'GET',

      dataType: 'json',


      success: function(apidata) {

         var status =
            apidata.status.toLowerCase();


         var statusText;
         var statusIcon;


         if (status === 'healthy') {

            statusText = 'HEALTHY';
            statusIcon = '🟢';

         }
         else if (status === 'warning') {

            statusText = 'WARNING';
            statusIcon = '🟡';

         }
         else if (status === 'critical') {

            statusText = 'CRITICAL';
            statusIcon = '🔴';

         }
         else {

            statusText = 'UNKNOWN';
            statusIcon = '⚪';

         }


         $('#health_status').text(
            statusIcon + ' ' + statusText
         );


         updateHealthMetric(
            '#health_cpu',
            '#health_cpu_status',
            apidata.cpu
         );


         updateHealthMetric(
            '#health_memory',
            '#health_memory_status',
            apidata.memory
         );


         updateHealthMetric(
            '#health_disk',
            '#health_disk_status',
            apidata.disk
         );

      },


      error: function(request, error) {

         $('#health_status').text(
            '⚪ UNAVAILABLE'
         );


         console.log(
            'Health API Request: ' +
            JSON.stringify(request)
         );

      }

   });
}


// =========================================================
// HEALTH METRIC STATUS
// =========================================================

function updateHealthMetric(
   valueSelector,
   statusSelector,
   value
) {

   var status;
   var icon;


   if (value >= 90) {

      status = 'CRITICAL';
      icon = '🔴';

   }
   else if (value >= 75) {

      status = 'WARNING';
      icon = '🟡';

   }
   else {

      status = 'HEALTHY';
      icon = '🟢';

   }


   $(valueSelector).text(
      value.toFixed(2) + '%'
   );


   $(statusSelector).text(
      icon + ' ' + status
   );
}


// =========================================================
// PERFORMANCE MONITOR
// =========================================================

function refreshCharts() {

   $.ajax({

      url: '/api/monitor',

      type: 'GET',

      dataType: 'json',


      success: function(apidata) {

         data_memcpu.setValue(
            0,
            1,
            apidata.cpu
         );


         data_memcpu.setValue(
            1,
            1,
            apidata.mem
         );


         data_disk.setValue(
            0,
            1,
            apidata.disk_read /
            (1024000 * refresh_sec)
         );


         data_disk.setValue(
            1,
            1,
            apidata.disk_write /
            (1024000 * refresh_sec)
         );


         data_net.setValue(
            0,
            1,
            apidata.net_sent /
            (1024000 * refresh_sec)
         );


         data_net.setValue(
            1,
            1,
            apidata.net_recv /
            (1024000 * refresh_sec)
         );


         chart_memcpu.draw(
            data_memcpu,
            options_percent
         );


         chart_disk.draw(
            data_disk,
            options_io
         );


         chart_net.draw(
            data_net,
            options_io
         );

      },


      error: function(request, error) {

         console.log(
            'Monitor API Request: ' +
            JSON.stringify(request)
         );

      }

   });
}


// =========================================================
// PROCESS MONITOR
// =========================================================

function refreshProcesses() {

   $.ajax({

      url: '/api/process',

      type: 'GET',

      dataType: 'json',


      success: function(apidata) {

         $('#process_tab').empty();


         $('#proc_count').text(
            apidata.processes.length
         );


         for (
            var p = 0;
            p < apidata.processes.length;
            p++
         ) {

            var process =
               apidata.processes[p];


            var memory =
               process.memory_percent !== null
               ? process.memory_percent.toFixed(2)
               : 'N/A';


            var cpu_time = 'N/A';


            if (
               process.cpu_times &&
               process.cpu_times.length >= 2
            ) {

               cpu_time = (
                  process.cpu_times[0] +
                  process.cpu_times[1]
               ).toFixed(2);

            }


            var threads =
               process.num_threads !== null
               ? process.num_threads
               : 'N/A';


            $('#process_tab').append(

               '<tr>' +

               '<td>' +
               process.pid +
               '</td>' +

               '<td>' +
               process.name +
               '</td>' +

               '<td>' +
               memory +
               '</td>' +

               '<td>' +
               cpu_time +
               '</td>' +

               '<td>' +
               threads +
               '</td>' +

               '</tr>'

            );

         }

      },


      error: function(request, error) {

         console.log(
            'Process API Request: ' +
            JSON.stringify(request)
         );

      }

   });
}


// =========================================================
// SERVICE HEALTH
// =========================================================

function refreshServices() {

   $.ajax({

      url: '/api/services',

      type: 'GET',

      dataType: 'json',


      success: function(apidata) {

         $('#service_platform').text(
            apidata.platform
         );


         $('#service_table').empty();


         if (
            !apidata.services ||
            apidata.services.length === 0
         ) {

            $('#service_table').append(

               '<tr>' +
               '<td colspan="2">' +
               'No services detected' +
               '</td>' +
               '</tr>'

            );

            return;
         }


         for (
            var i = 0;
            i < apidata.services.length;
            i++
         ) {

            var service =
               apidata.services[i];


            var status =
               service.status;


            var displayStatus =
               status.toUpperCase();


            var icon = '⚪';


            if (status === 'running') {

               icon = '🟢';

            }
            else if (status === 'stopped') {

               icon = '🔴';

            }
            else if (status === 'active') {

               icon = '🟢';

            }


            $('#service_table').append(

               '<tr>' +

               '<td>' +
               service.name +
               '</td>' +

               '<td>' +
               icon +
               ' ' +
               displayStatus +
               '</td>' +

               '</tr>'

            );

         }

      },


      error: function(request, error) {

         $('#service_table').html(

            '<tr>' +
            '<td colspan="2">' +
            'Unable to retrieve service information' +
            '</td>' +
            '</tr>'

         );


         console.log(
            'Service API Request: ' +
            JSON.stringify(request)
         );

      }

   });
}


// =========================================================
// NETWORK HEALTH
// =========================================================

function refreshNetwork() {

   $.ajax({

      url: '/api/network',

      type: 'GET',

      dataType: 'json',


      success: function(apidata) {

         $('#network_table').empty();


         if (
            !apidata.targets ||
            apidata.targets.length === 0
         ) {

            $('#network_table').append(

               '<tr>' +
               '<td colspan="4">' +
               'No network targets available' +
               '</td>' +
               '</tr>'

            );

            return;
         }


         for (
            var i = 0;
            i < apidata.targets.length;
            i++
         ) {

            var target =
               apidata.targets[i];


            var icon = '⚪';


            if (target.status === 'online') {

               icon = '🟢';

            }
            else if (target.status === 'offline') {

               icon = '🔴';

            }
            else if (target.status === 'error') {

               icon = '🟠';

            }


            var latency = 'Not available';


            if (
               target.latency_ms !== null &&
               target.latency_ms !== undefined
            ) {

               latency =
                  target.latency_ms.toFixed(2) +
                  ' ms';

            }


            $('#network_table').append(

               '<tr>' +

               '<td>' +
               target.name +
               '</td>' +

               '<td>' +
               target.target +
               '</td>' +

               '<td>' +
               icon +
               ' ' +
               target.status.toUpperCase() +
               '</td>' +

               '<td>' +
               latency +
               '</td>' +

               '</tr>'

            );

         }

      },


      error: function(request, error) {

         $('#network_table').html(

            '<tr>' +
            '<td colspan="4">' +
            'Unable to retrieve network information' +
            '</td>' +
            '</tr>'

         );


         console.log(
            'Network API Request: ' +
            JSON.stringify(request)
         );

      }

   });
}