var data_memcpu;
var data_disk;
var data_net;

var chart_memcpu;
var chart_disk;
var chart_net;

var options_percent;
var options_io;

var refresh_sec = 3.0;


// =========================================================
// INITIALIZE DASHBOARD
// =========================================================

function initCharts() {

   // CPU + Memory
   data_memcpu = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['CPU', 0],
      ['Memory', 0]
   ]);


   // Disk I/O
   data_disk = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['Disk read', 0],
      ['Disk write', 0]
   ]);


   // Network I/O
   data_net = google.visualization.arrayToDataTable([
      ['Label', 'Value'],
      ['Net sent', 0],
      ['Net recv', 0]
   ]);


   // Percentage gauge
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


   // I/O gauge
   options_io = {

      max: 200,

      minorTicks: 10,

      animation: {
         duration: 950,
         easing: 'inAndOut'
      }
   };


   // Create CPU/Memory gauge
   chart_memcpu =
      new google.visualization.Gauge(
         document.getElementById('chart1')
      );


   // Create Disk gauge
   chart_disk =
      new google.visualization.Gauge(
         document.getElementById('chart2')
      );


   // Create Network gauge
   chart_net =
      new google.visualization.Gauge(
         document.getElementById('chart3')
      );


   // Initial refresh
   refreshCharts();

   refreshProcesses();

   refreshNetwork();


   // Start timers
   setRefresh(refresh_sec);


   $('#refrate').text(refresh_sec);

   $('#refslider').val(refresh_sec);


   // Refresh slider
   $(document).on(
      'input',
      '#refslider',
      function () {

         setRefresh($(this).val());

      }
   );
}


// =========================================================
// REFRESH TIMERS
// =========================================================

var proc_timer;
var chart_timer;
var network_timer;


function setRefresh(new_secs) {

   refresh_sec = parseFloat(new_secs);

   $('#refrate').text(refresh_sec);


   // Clear existing timers
   clearInterval(proc_timer);

   clearInterval(chart_timer);

   clearInterval(network_timer);


   // Process refresh
   proc_timer = setInterval(
      function () {

         refreshProcesses();

      },
      refresh_sec * 1000
   );


   // Performance refresh
   chart_timer = setInterval(
      function () {

         refreshCharts();

      },
      refresh_sec * 1000
   );


   // Network refresh
   network_timer = setInterval(
      function () {

         refreshNetwork();

      },
      refresh_sec * 1000
   );
}


// =========================================================
// SYSTEM PERFORMANCE MONITOR
// =========================================================

function refreshCharts() {

   $.ajax({

      url: '/api/monitor',

      type: 'GET',

      dataType: 'json',


      success: function (apidata) {

         // CPU
         data_memcpu.setValue(
            0,
            1,
            apidata.cpu
         );


         // Memory
         data_memcpu.setValue(
            1,
            1,
            apidata.mem
         );


         // Disk read
         data_disk.setValue(
            0,
            1,
            apidata.disk_read /
            (1024000 * refresh_sec)
         );


         // Disk write
         data_disk.setValue(
            1,
            1,
            apidata.disk_write /
            (1024000 * refresh_sec)
         );


         // Network sent
         data_net.setValue(
            0,
            1,
            apidata.net_sent /
            (1024000 * refresh_sec)
         );


         // Network received
         data_net.setValue(
            1,
            1,
            apidata.net_recv /
            (1024000 * refresh_sec)
         );


         // Draw CPU + Memory
         chart_memcpu.draw(
            data_memcpu,
            options_percent
         );


         // Draw Disk
         chart_disk.draw(
            data_disk,
            options_io
         );


         // Draw Network
         chart_net.draw(
            data_net,
            options_io
         );

      },


      error: function (request, error) {

         console.log(
            "Monitor API Request: " +
            JSON.stringify(request)
         );

      }

   });
}


// =========================================================
// PROCESS MONITORING
// =========================================================

function refreshProcesses() {

   $.ajax({

      url: '/api/process',

      type: 'GET',

      dataType: 'json',


      success: function (apidata) {

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


            var cpuTime =
               (
                  process.cpu_times[0] +
                  process.cpu_times[1]
               ).toFixed(2);


            var memory =
               process.memory_percent.toFixed(2);


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
               cpuTime +
               '</td>' +

               '<td>' +
               process.num_threads +
               '</td>' +

               '</tr>'

            );

         }


         // Keep sorting functionality
         var myTH =
            document.getElementsByTagName("th")[2];


         if (myTH) {

            myTH.click();

            myTH.click();

         }

      },


      error: function (request, error) {

         console.log(
            "Process API Request: " +
            JSON.stringify(request)
         );

      }

   });
}


// =========================================================
// NETWORK HEALTH MONITORING
// =========================================================

function refreshNetwork() {

   $.ajax({

      url: '/api/network',

      type: 'GET',

      dataType: 'json',


      success: function (apidata) {

         $('#network_tab').empty();


         // Make sure targets exist
         if (
            !apidata.targets ||
            apidata.targets.length === 0
         ) {

            $('#network_tab').append(

               '<tr>' +

               '<td colspan="4">' +

               'No network targets found' +

               '</td>' +

               '</tr>'

            );

            return;
         }


         // Display every target
         for (
            var i = 0;
            i < apidata.targets.length;
            i++
         ) {

            var target =
               apidata.targets[i];


            var status;
            var latency;


            // Online
            if (
               target.status === "online"
            ) {

               status = "🟢 ONLINE";


               if (
                  target.latency_ms !== null
               ) {

                  latency =
                     target.latency_ms.toFixed(2) +
                     " ms";

               }

               else {

                  latency = "N/A";

               }

            }


            // Offline
            else if (
               target.status === "offline"
            ) {

               status = "🔴 OFFLINE";

               latency = "N/A";

            }


            // Error
            else {

               status = "⚠ ERROR";

               latency = "N/A";

            }


            $('#network_tab').append(

               '<tr>' +

               '<td>' +
               target.name +
               '</td>' +

               '<td>' +
               target.target +
               '</td>' +

               '<td>' +
               status +
               '</td>' +

               '<td>' +
               latency +
               '</td>' +

               '</tr>'

            );

         }

      },


      error: function (request, error) {

         console.log(
            "Network API Request: " +
            JSON.stringify(request)
         );


         $('#network_tab').html(

            '<tr>' +

            '<td colspan="4">' +

            'Unable to check network' +

            '</td>' +

            '</tr>'

         );

      }

   });
}