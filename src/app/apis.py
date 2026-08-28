from flask import jsonify, current_app as app
import psutil
import subprocess
import platform
import re


# Store previous values for calculating disk and network I/O
olddata = {
    "disk_write": 0,
    "disk_read": 0,
    "net_sent": 0,
    "net_recv": 0
}


# ---------------------------------------------------------
# PROCESS MONITORING API
# ---------------------------------------------------------

@app.route("/api/process")
def api_process():
    """
    Returns real-time process information.
    """
    apidata = {}

    try:
        apidata["processes"] = []

        for proc in psutil.process_iter():
            try:
                pinfo = proc.as_dict(
                    attrs=[
                        "pid",
                        "name",
                        "memory_percent",
                        "num_threads",
                        "cpu_times"
                    ]
                )

            except psutil.NoSuchProcess:
                pass

            else:
                apidata["processes"].append(pinfo)

    except Exception:
        pass

    return jsonify(apidata)


# ---------------------------------------------------------
# SYSTEM MONITORING API
# ---------------------------------------------------------

@app.route("/api/monitor")
def api_monitor():
    """
    Returns real-time CPU, memory, disk,
    network and disk I/O information.
    """

    apidata = {}

    # CPU usage
    apidata["cpu"] = psutil.cpu_percent(interval=0.9)

    # Memory usage
    apidata["mem"] = psutil.virtual_memory().percent

    # Disk usage
    apidata["disk"] = psutil.disk_usage("/").percent

    # -----------------------------------------------------
    # NETWORK I/O
    # -----------------------------------------------------

    try:
        netio = psutil.net_io_counters()

        # Network sent
        apidata["net_sent"] = (
            0
            if olddata["net_sent"] == 0
            else netio.bytes_sent - olddata["net_sent"]
        )

        olddata["net_sent"] = netio.bytes_sent

        # Network received
        apidata["net_recv"] = (
            0
            if olddata["net_recv"] == 0
            else netio.bytes_recv - olddata["net_recv"]
        )

        olddata["net_recv"] = netio.bytes_recv

    except Exception:
        apidata["net_sent"] = -1
        apidata["net_recv"] = -1


    # -----------------------------------------------------
    # DISK I/O
    # -----------------------------------------------------

    try:
        diskio = psutil.disk_io_counters()

        # Disk write
        apidata["disk_write"] = (
            0
            if olddata["disk_write"] == 0
            else diskio.write_bytes - olddata["disk_write"]
        )

        olddata["disk_write"] = diskio.write_bytes

        # Disk read
        apidata["disk_read"] = (
            0
            if olddata["disk_read"] == 0
            else diskio.read_bytes - olddata["disk_read"]
        )

        olddata["disk_read"] = diskio.read_bytes

    except Exception:
        apidata["disk_write"] = -1
        apidata["disk_read"] = -1


    return jsonify(apidata)


# ---------------------------------------------------------
# NETWORK HEALTH MONITORING API
# ---------------------------------------------------------
@app.route("/api/network")
def api_network():
    """
    Monitor connectivity and latency for multiple network targets.
    """

    targets = {
        "Google DNS": "8.8.8.8",
        "Cloudflare DNS": "1.1.1.1",
        "Localhost": "127.0.0.1"
    }

    results = []

    for name, target in targets.items():

        try:

            if platform.system().lower() == "windows":
                command = [
                    "ping",
                    "-n",
                    "1",
                    "-w",
                    "2000",
                    target
                ]
            else:
                command = [
                    "ping",
                    "-c",
                    "1",
                    "-W",
                    "2",
                    target
                ]

            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=3
            )

            if result.returncode == 0:

                output = result.stdout

                match = re.search(
                    r"time[=<]\s*(\d+(?:\.\d+)?)\s*ms",
                    output
                )

                latency = (
                    float(match.group(1))
                    if match
                    else None
                )

                results.append({
                    "name": name,
                    "target": target,
                    "status": "online",
                    "latency_ms": latency
                })

            else:

                results.append({
                    "name": name,
                    "target": target,
                    "status": "offline",
                    "latency_ms": None
                })

        except Exception as error:

            results.append({
                "name": name,
                "target": target,
                "status": "error",
                "latency_ms": None,
                "message": str(error)
            })

    return jsonify({
        "targets": results
    })