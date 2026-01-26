# Lets_Brute_Force_Port_22
This repository provides an SSH (Port 22) authentication security auditing tool designed for authorized penetration testing, labs, and defensive research.
The project helps security teams and system administrators evaluate SSH hardening by simulating controlled login 
attempts against test environments to identify weak credentials, misconfigurations, and poor access controls.

The tool supports Telegram integration, enabling real-time notifications, audit summaries, and alerting during assessment runs. 
Users can configure Telegram Bot tokens and chat IDs to receive status updates, success/failure logs, and completion reports remotely.

Built with a focus on ethical use, the project emphasizes rate-limiting, logging, and clear authorization boundaries. 
It is intended strictly for environments you own or have explicit permission to test, such as virtual labs, training networks, and capture-the-flag scenarios.

This repository is ideal for learning SSH defense strategies, improving password policies, enforcing key-based authentication, and strengthening overall server security posture.


## How to clone the repo

```bash
git clone https://github.com/Iankulani/Lets_Brute_Force_Port_22.git
cd Lets_Brute_Force_Port_22

```

## How to run
```bash
python3 Lets_Brute_Force_Port_22.py
```
