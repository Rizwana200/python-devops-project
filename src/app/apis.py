from flask import jsonify, current_app as app
import psutil
import subprocess
import platform
import re


# =========================================================
# STORED METRICS
# =========================================================

olddata = {
    "disk_write": 0,
    "disk_read": 0,
    "net_sent": 0,
    "net_recv": 0
}


# =========================================================
# PROCESS MONITORING API
# =========================================================

@app.route("/api/process")
def api_process():
    """
    Returns real-time process information.
    """

    apidata = {
        "processes": []
    }

    try:
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
                continue

            else:
                apidata["processes"].append(pinfo)

    except Exception:
        pass

    return jsonify(apidata)


# =========================================================
# SYSTEM MONITORING API
# =========================================================

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

        apidata["net_sent"] = (
            0
            if olddata["net_sent"] == 0
            else netio.bytes_sent - olddata["net_sent"]
        )

        olddata["net_sent"] = netio.bytes_sent

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

        apidata["disk_write"] = (
            0
            if olddata["disk_write"] == 0
            else diskio.write_bytes - olddata["disk_write"]
        )

        olddata["disk_write"] = diskio.write_bytes

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


# =========================================================
# SYSTEM HEALTH API
# =========================================================

@app.route("/api/health")
def api_health():
    """
    Calculates overall system health from
    CPU, memory and disk utilization.
    """

    cpu = psutil.cpu_percent(interval=0.5)
    memory = psutil.virtual_memory().percent
    disk = psutil.disk_usage("/").percent


    values = {
        "cpu": cpu,
        "memory": memory,
        "disk": disk
    }


    # Determine worst condition
    if any(value >= 90 for value in values.values()):

        status = "critical"

    elif any(value >= 75 for value in values.values()):

        status = "warning"

    else:

        status = "healthy"


    return jsonify({
        "status": status,
        "cpu": cpu,
        "memory": memory,
        "disk": disk
    })


# =========================================================
# NETWORK HEALTH MONITORING API
# =========================================================

@app.route("/api/network")
def api_network():
    """
    Monitor connectivity and latency
    for multiple network targets.
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


# =========================================================
# SERVICE MONITORING API
# =========================================================

@app.route("/api/services")
def api_services():
    """
    Checks important operating system services.

    Supports Windows and Linux/Ubuntu.
    """

    system = platform.system().lower()

    services = []


    # -----------------------------------------------------
    # WINDOWS SERVICES
    # -----------------------------------------------------

    if system == "windows":

        service_names = [
            "Spooler",
            "W32Time"
        ]


        for service_name in service_names:

            try:

                result = subprocess.run(
                    [
                        "sc",
                        "query",
                        service_name
                    ],
                    capture_output=True,
                    text=True,
                    timeout=5
                )


                output = result.stdout.upper()


                if "RUNNING" in output:

                    status = "running"

                elif "STOPPED" in output:

                    status = "stopped"

                else:

                    status = "unknown"


                services.append({
                    "name": service_name,
                    "status": status
                })


            except Exception as error:

                services.append({
                    "name": service_name,
                    "status": "error",
                    "message": str(error)
                })


    # -----------------------------------------------------
    # LINUX SERVICES
    # -----------------------------------------------------

    else:

        service_names = [
            "ssh",
            "docker",
            "nginx"
        ]


        for service_name in service_names:

            try:

                result = subprocess.run(
                    [
                        "systemctl",
                        "is-active",
                        service_name
                    ],
                    capture_output=True,
                    text=True,
                    timeout=5
                )


                status = result.stdout.strip()


                if status == "active":

                    service_status = "running"

                elif status == "inactive":

                    service_status = "stopped"

                else:

                    service_status = (
                        status
                        if status
                        else "unknown"
                    )


                services.append({
                    "name": service_name,
                    "status": service_status
                })


            except Exception as error:

                services.append({
                    "name": service_name,
                    "status": "error",
                    "message": str(error)
                })


    return jsonify({
        "platform": platform.system(),
        "services": services
    })