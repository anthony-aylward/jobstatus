//----------------------------------------------------------------------------//
//                          qstat job watching module                         //
//----------------------------------------------------------------------------//

// Accepts a qstat job ID as an argument and watches the job by checking its 
// qstat status once per second.

// Usage: node jobstatus.js job_id

//----------------------------------------------------------------------------//

// Define the job-watching function.

function watchJob(job_id) {
    metronome = setInterval(returnJobStatus, 1000, job_id);
};

// Define the status-returning function.

function returnJobStatus(job_id) {

    // Declare some variables, including the child process.

    var spawn = require('child_process').spawn,
        qstat = spawn('qstat', [job_id]),
        status = {
            C:'Completed',
            E:'Exiting',
            H:'Held',
            Q:'Queued',
            R:'Running',
            T:'Transit',
            W:'Waiting',
            S:'Suspended'
        };

    // If the job exists, check and return its status. If it is complete, stop
    // the metronome.

    qstat.stdout.on('data', function (data) {
        var re = /(\s)+/g,
            job_status = data
                        .toString()
                        .split("\n")[2]
                        .replace(re, " ")
                        .split(" ")[4];
        if (job_status == "C") {
            clearInterval(metronome);
        };
        console.log(status[job_status]);
    });

    // If the job doesn't exist, return that information and stop the metronome.
    // If some other error occurs, say so.

    qstat.stderr.on('data', function (data) {
        var doesnt_exist = data
                          .toString()
                          .slice(0,27)
                          ==
                          'qstat: Unknown Job Id Error';
        if (doesnt_exist) {
            clearInterval(metronome);
            console.log('Doesn\'t Exist');
        } else {
            console.log('stderr: ' + data);
        };
    });
};

//----------------------------------------------------------------------------//

// Define a function to return a job's status, creation time, and running 
// time.

function returnJobInfo(job_id) {

    // Declare some variables, including the child process.

    var spawn = require('child_process').spawn,
        qstat = spawn('qstat', ['-f', job_id]),
        status = {
            C:'Completed',
            E:'Exiting\t',
            H:'Held\t',
            Q:'Queued\t',
            R:'Running\t',
            T:'Transit\t',
            W:'Waiting\t',
            S:'Suspended'
        },
        month = {
            Jan:'01',
            Feb:'02',
            Mar:'03',
            Apr:'04',
            May:'05',
            Jun:'06',
            Jul:'07',
            Aug:'08',
            Sep:'09',
            Oct:'10',
            Nov:'11',
            Dec:'12'
        };

    // Extract job status, creation time, and running time from qstat's output.

    qstat.stdout.on('data', function (data) {
        
        var job_data = data.toString(),
            job_state = job_data.split("job_state = ")[1]
                                .split("\n")[0],
            job_ctime = job_data.split("ctime = ")[1]
                                .split("\n")[0];
            
        // If the job is completed, report the runtime given by qstat. If 
        // it is still running, calculate the total elapsed running time 
        // and report it.
            
         if (job_state == "C") {
            var job_rtime = job_data.split("total_runtime = ")[1]
                                           .split("\n")[0];
        } else {
            var job_stime = job_data.split("start_time = ")[1]
                                    .split("\n")[0]
                                    .split(" "),
                job_sdate = job_stime[4] + "-"
                          + month[job_stime[1]] + "-"
                          + job_stime[2] + "T"
                          + job_stime[3],
                runtime = (1/1000)*(new Date() - new Date(job_sdate))-28800,
                job_rtime = runtime.toString();
        };
        
        // Report the collected information.
        
        console.log([job_id,
                     status[job_state],
                     job_ctime,
                     job_rtime
                    ].join("\t")); 
    });

    // If an error occurs, say so.

    qstat.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
};

//----------------------------------------------------------------------------//

// Define a function to return the statuses, creation times, and running times 
// of all jobs.

function allJobs() {

    // Declare some variables, including the child process.

    var spawn = require('child_process').spawn,
        qstat = spawn('qstat');
        header = [
                    ["Job ID         ",
                     "Status         ",
                     "Creation Time             ",
                     "Running Time   "].join("\t"),
                    ["---------------",
                     "-----------",
                     "--------------------------",
                     "---------------"].join("\t")
                    ].join("\n");
    console.log(header);
    
    qstat.stdout.on('data', function (data) {
        var job_data = data
                      .toString()
                      .split("\n");
            
        for ( i=2; i < job_data.length-1; i++ ) {
            var job_id = job_data[i].split(" ")[0];
            returnJobInfo(job_id);
        };
    });
};

//----------------------------------------------------------------------------//

// Watch a job whose ID was given as an argument.

//watchJob(process.argv[2]);

// Return the status, creation time, and running time of all jobs.

//allJobs()

// Export.

exports.watchJob = watchJob;
exports.returnJobStatus = returnJobStatus;
exports.returnJobInfo = returnJobInfo;
exports.allJobs = allJobs;
