from flask import render_template, current_app as app

import cpuinfo
import psutil
import platform
import datetime


# =========================================================
# DASHBOARD
# =========================================================

@app.route("/")
def index():
    return render_template("index.html")


# =========================================================
# SYSTEM INFORMATION
# =========================================================

@app.route("/info")
def info():
    """
    Collects detailed system and hardware information.
    """

    osinfo = {}

    # Operating system
    osinfo["platform"] = platform.system()
    osinfo["os_version"] = platform.version()
    osinfo["release"] = platform.release()
    osinfo["architecture"] = platform.machine()

    # Host
    osinfo["hostname"] = platform.node()

    # Kernel
    osinfo["kernel"] = platform.release()

    # Python
    osinfo["python"] = platform.python_version()

    # CPU information
    osinfo["cpu"] = cpuinfo.get_cpu_info()

    # CPU cores
    osinfo["physical_cores"] = psutil.cpu_count(
        logical=False
    )

    osinfo["logical_cores"] = psutil.cpu_count(
        logical=True
    )

    # Memory
    memory = psutil.virtual_memory()

    osinfo["memory_total"] = memory.total
    osinfo["memory_available"] = memory.available
    osinfo["memory_percent"] = memory.percent

    # Disk
    try:

        disk = psutil.disk_usage("/")

        osinfo["disk_total"] = disk.total
        osinfo["disk_used"] = disk.used
        osinfo["disk_free"] = disk.free
        osinfo["disk_percent"] = disk.percent

    except Exception:

        osinfo["disk_total"] = 0
        osinfo["disk_used"] = 0
        osinfo["disk_free"] = 0
        osinfo["disk_percent"] = 0

    # Network interfaces
    osinfo["net"] = psutil.net_if_addrs()

    # Boot time
    osinfo["boottime"] = datetime.datetime.fromtimestamp(
        psutil.boot_time()
    ).strftime("%Y-%m-%d %H:%M:%S")

    # System uptime
    uptime_seconds = (
        datetime.datetime.now().timestamp()
        - psutil.boot_time()
    )

    osinfo["uptime_seconds"] = uptime_seconds

    osinfo["uptime_hours"] = round(
        uptime_seconds / 3600,
        2
    )

    return render_template(
        "info.html",
        info=osinfo
    )


# =========================================================
# PERFORMANCE MONITOR
# =========================================================

@app.route("/monitor")
def monitor():
    return render_template("monitor.html")