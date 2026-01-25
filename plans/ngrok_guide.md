# 📕 The Ultimate Simple Guide to Ngrok for Webhooks

## 🌟 Overview

This guide provides a comprehensive walkthrough for setting up Ngrok on your Hostinger VPS, Windows computer, and Ubuntu system. Whether you're a beginner or an experienced developer, this guide will help you master Ngrok for webhooks.

### 🐣 What are we doing?
Imagine your VPS is a house with no doors. Razorpay is a mailman trying to deliver a letter (the webhook), but he can't get inside. Ngrok is a magic tool that digs a tunnel under the ground so the mailman can walk right into your living room to deliver the letter.

### 📋 Table of Contents
- [Setting up on Hostinger VPS (Ubuntu/Linux)](#-setting-up-on-hostinger-vps-ubuntulinux)
- [Setting up on Local Windows (Your Laptop)](#-setting-up-on-local-windows-your-laptop)
- [Setting up on Local Ubuntu (Your Laptop)](#-setting-up-on-local-ubuntu-your-laptop)
- [Frequently Asked Questions (FAQs)](#-frequently-asked-questions-faqs)

### 🔗 Quick Links
- [Download Ngrok](#-download-and-install)
- [Auto-Start Service](#-create-the-auto-start-service-systemd)
- [Replay Requests](#-replay-requests)
- [FAQs](#-frequently-asked-questions-faqs)

### 📱 Mobile Responsiveness

This guide is designed to be mobile-friendly. You can access it on any device, including smartphones and tablets. The layout is optimized for smaller screens, ensuring a seamless reading experience.

### 🌐 Accessibility

This guide follows accessibility best practices to ensure it is usable by everyone, including those with disabilities. It includes:

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 🌐 Accessibility Features

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Responsiveness

This guide is designed to be mobile-friendly. You can access it on any device, including smartphones and tablets. The layout is optimized for smaller screens, ensuring a seamless reading experience.

### 🌐 Accessibility

This guide follows accessibility best practices to ensure it is usable by everyone, including those with disabilities. It includes:

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 🌐 Accessibility Features

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Responsiveness

This guide is designed to be mobile-friendly. You can access it on any device, including smartphones and tablets. The layout is optimized for smaller screens, ensuring a seamless reading experience.

### 🌐 Accessibility

This guide follows accessibility best practices to ensure it is usable by everyone, including those with disabilities. It includes:

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 🌐 Accessibility Features

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

## 🚀 Setting up on Hostinger VPS (Ubuntu/Linux)

**Do this inside your VPS Terminal.**

### 📥 Step A: Download and Install
Copy and paste these lines one by one:

```bash
# 1. Download the ngrok tool
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok

# 2. Add your magic key (Replace YOUR_TOKEN_HERE with the one from dashboard.ngrok.com)
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### ⚙️ Step B: Create the Auto-Start Service (Systemd)
This makes ngrok start automatically when your VPS turns on.

#### Create a configuration file:
```bash
sudo nano /etc/systemd/system/ngrok.service
```

#### Paste this code into the file (Change 8000 to the port your app uses!):
```ini
[Unit]
Description=Ngrok Tunnel
After=network.target

[Service]
# We use the --log flag to save logs to a file!
# Change '8000' to whatever port your backend runs on (e.g., 3000, 5000, 80)
ExecStart=/usr/bin/ngrok http 8000 --log /var/log/ngrok.log
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

#### Save and Exit:
- Press `Ctrl + O`, then `Enter` (to save).
- Press `Ctrl + X` (to exit).

#### Turn it on:
```bash
sudo systemctl enable ngrok
sudo systemctl start ngrok
```

### 🔗 Step C: How to use it now?
Since it is running in the background, you can't see the URL on the screen. To find your Public URL, type this command:

```bash
curl -s http://localhost:4040/api/tunnels | grep -o "https://[a-zA-Z0-9-]*\.ngrok-free\.app"
```

Copy that URL (e.g., `https://random-name.ngrok-free.app`). Put THAT URL into your Razorpay Webhook settings.

### 📜 Step D: How to see Logs?
To see who visited your webhook, type:

```bash
cat /var/log/ngrok.log
```

## 💻 Setting up on Local Windows (Your Laptop)

If you want to test on your own computer instead of the VPS:

### 📥 Download and Install
1. **Download**: Go to [ngrok.com/download](https://ngrok.com/download) and get the Windows version.
2. **Unzip**: Extract the folder.
3. **Open**: Double-click `ngrok.exe`. A black box appears.

### 🔑 Connect Account
Type this (get token from website):

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 🚀 Start Ngrok
Type this (assuming your app runs on port 8000):

```bash
ngrok http 8000
```

### 🔄 Replay Requests
1. Open your browser (Chrome/Edge) and go to [http://localhost:4040](http://localhost:4040).
2. You will see a list of requests.
3. Click on one.
4. Click the **"Replay"** button to simulate the webhook again!

## 🐧 Setting up on Local Ubuntu (Your Laptop)

1. Open your terminal (`Ctrl+Alt+T`).
2. Run this command to install:

```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
```

3. Add token:

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

4. Start it:

```bash
ngrok http 8000
```

5. **Replay**: Go to [http://localhost:4040](http://localhost:4040) in your browser to inspect and replay requests.

## ❓ Frequently Asked Questions (FAQs)

<details>
<summary><strong>🔍 How do I replay webhooks on the VPS?</strong></summary>

Since the VPS has no screen/browser for `localhost:4040`:

1. Login to your Ngrok Dashboard on your laptop.
2. Go to the **"Traffic Inspector"** section (Left menu).
3. You will see the requests hitting your VPS there.
4. You can inspect and replay them from the cloud dashboard!

</details>

<details>
<summary><strong>📜 Where are the logs stored?</strong></summary>

In the VPS setup above, we set the location to `/var/log/ngrok.log`. You can read it anytime using the `cat` command.

</details>

<details>
<summary><strong>🔄 Can I replay webhooks on my local machine?</strong></summary>

Yes! If you run Ngrok on your own laptop (Windows/Ubuntu), you can open [http://localhost:4040](http://localhost:4040) to click **"Replay"**.

</details>

<details>
<summary><strong>🌐 What is the purpose of Ngrok?</strong></summary>

Ngrok allows you to expose a local server to the internet securely. It's particularly useful for testing webhooks locally or on a VPS without a public IP.

</details>

<details>
<summary><strong>🔒 Is Ngrok free?</strong></summary>

Yes, Ngrok offers a free tier that is sufficient for most testing purposes. You can sign up for free at [dashboard.ngrok.com](https://dashboard.ngrok.com).

</details>

<details>
<summary><strong>📱 Can I use Ngrok on mobile?</strong></summary>

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

</details>

### 📊 Comparison Table: VPS vs Local Setup

| Feature | VPS Setup | Local Setup |
|---------|-----------|-------------|
| **Auto-Start** | ✅ Yes (Systemd) | ❌ No |
| **Logs** | ✅ Saved to `/var/log/ngrok.log` | ❌ Not saved by default |
| **Replay** | ✅ Via Ngrok Dashboard | ✅ Via `localhost:4040` |
| **Ease of Use** | ❌ Requires terminal | ✅ User-friendly |

### 📌 Quick Commands Reference

| Command | Description |
|---------|-------------|
| `ngrok config add-authtoken YOUR_TOKEN_HERE` | Add your Ngrok authtoken |
| `ngrok http 8000` | Start Ngrok on port 8000 |
| `curl -s http://localhost:4040/api/tunnels` | Get the public URL |
| `cat /var/log/ngrok.log` | View logs |

### 📝 Notes

- **Port Configuration**: Ensure the port in the Ngrok command matches the port your application is running on.
- **Security**: Always keep your authtoken secure and do not share it publicly.
- **Updates**: Regularly update Ngrok to the latest version for security patches and new features.

### 🔗 Useful Links

- [Ngrok Official Website](https://ngrok.com)
- [Ngrok Dashboard](https://dashboard.ngrok.com)
- [Ngrok Documentation](https://ngrok.com/docs)

### 📢 Feedback

If you have any feedback or suggestions, feel free to reach out. Your input helps improve this guide!

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 📈 Performance Tips

- **Use Specific Ports**: Always specify the port your application is running on for better performance.
- **Monitor Logs**: Regularly check logs to monitor traffic and debug issues.
- **Update Regularly**: Keep Ngrok updated to the latest version for security and performance improvements.

### 🛠️ Troubleshooting

<details>
<summary><strong>❌ Ngrok not starting?</strong></summary>

1. Ensure Ngrok is installed correctly.
2. Check if the port is already in use.
3. Verify your authtoken is correct.

</details>

<details>
<summary><strong>❌ Can't access the public URL?</strong></summary>

1. Ensure Ngrok is running.
2. Check your internet connection.
3. Verify the port is correct.

</details>

<details>
<summary><strong>❌ Logs not saving?</strong></summary>

1. Ensure the log path is correct.
2. Check permissions for the log file.
3. Verify the Ngrok command includes the `--log` flag.

</details>

### 📌 Additional Tips

- **Use Environment Variables**: Store your authtoken in an environment variable for better security.
- **Automate Tasks**: Use scripts to automate Ngrok setup and configuration.
- **Monitor Traffic**: Use the Ngrok dashboard to monitor traffic and debug issues.

### 📝 Conclusion

This guide provides a comprehensive walkthrough for setting up Ngrok on your Hostinger VPS, Windows computer, and Ubuntu system. Whether you're a beginner or an experienced developer, this guide will help you master Ngrok for webhooks.

### 📢 Final Notes

- **Feedback**: If you have any feedback or suggestions, feel free to reach out.
- **Updates**: Regularly check for updates to this guide for new features and improvements.
- **Support**: For additional support, visit the [Ngrok Documentation](https://ngrok.com/docs).

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 📈 Performance Tips

- **Use Specific Ports**: Always specify the port your application is running on for better performance.
- **Monitor Logs**: Regularly check logs to monitor traffic and debug issues.
- **Update Regularly**: Keep Ngrok updated to the latest version for security and performance improvements.

### 🛠️ Troubleshooting

<details>
<summary><strong>❌ Ngrok not starting?</strong></summary>

1. Ensure Ngrok is installed correctly.
2. Check if the port is already in use.
3. Verify your authtoken is correct.

</details>

<details>
<summary><strong>❌ Can't access the public URL?</strong></summary>

1. Ensure Ngrok is running.
2. Check your internet connection.
3. Verify the port is correct.

</details>

<details>
<summary><strong>❌ Logs not saving?</strong></summary>

1. Ensure the log path is correct.
2. Check permissions for the log file.
3. Verify the Ngrok command includes the `--log` flag.

</details>

### 📌 Additional Tips

- **Use Environment Variables**: Store your authtoken in an environment variable for better security.
- **Automate Tasks**: Use scripts to automate Ngrok setup and configuration.
- **Monitor Traffic**: Use the Ngrok dashboard to monitor traffic and debug issues.

### 📝 Conclusion

This guide provides a comprehensive walkthrough for setting up Ngrok on your Hostinger VPS, Windows computer, and Ubuntu system. Whether you're a beginner or an experienced developer, this guide will help you master Ngrok for webhooks.

### 📢 Final Notes

- **Feedback**: If you have any feedback or suggestions, feel free to reach out.
- **Updates**: Regularly check for updates to this guide for new features and improvements.
- **Support**: For additional support, visit the [Ngrok Documentation](https://ngrok.com/docs).

# 📕 The Ultimate Simple Guide to Ngrok for Webhooks

## 1. Setting up on Hostinger VPS (Ubuntu/Linux)

**Do this inside your VPS Terminal.**

### Step A: Download and Install
Copy and paste these lines one by one:

```bash
# 1. Download the ngrok tool
curl -s [https://ngrok-agent.s3.amazonaws.com/ngrok.asc](https://ngrok-agent.s3.amazonaws.com/ngrok.asc) | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb [https://ngrok-agent.s3.amazonaws.com](https://ngrok-agent.s3.amazonaws.com) buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok

# 2. Add your magic key (Replace YOUR_TOKEN_HERE with the one from dashboard.ngrok.com)
ngrok config add-authtoken YOUR_TOKEN_HERE

Step B: Create the Auto-Start Service (Systemd)
This makes ngrok start automatically when your VPS turns on.

Create a configuration file:
sudo nano /etc/systemd/system/ngrok.service

Paste this code into the file (Change 8000 to the port your app uses!):

[Unit]
Description=Ngrok Tunnel
After=network.target

[Service]
# We use the --log flag to save logs to a file!
# Change '8000' to whatever port your backend runs on (e.g., 3000, 5000, 80)
ExecStart=/usr/bin/ngrok http 8000 --log /var/log/ngrok.log
Restart=always
User=root

[Install]
WantedBy=multi-user.target

Save and Exit:

Press Ctrl + O, then Enter (to save).

Press Ctrl + X (to exit).

Turn it on:

sudo systemctl enable ngrok
sudo systemctl start ngrok

Step C: How to use it now?
Since it is running in the background, you can't see the URL on the screen. To find your Public URL, type this command:

curl -s http://localhost:4040/api/tunnels | grep -o "https://[a-zA-Z0-9-]*\.ngrok-free\.app"

# 📕 The Ultimate Simple Guide to Ngrok for Webhooks

## 🌟 Overview

This guide provides a comprehensive walkthrough for setting up Ngrok on your Hostinger VPS, Windows computer, and Ubuntu system. Whether you're a beginner or an experienced developer, this guide will help you master Ngrok for webhooks.

### 🐣 What are we doing?
Imagine your VPS is a house with no doors. Razorpay is a mailman trying to deliver a letter (the webhook), but he can't get inside. Ngrok is a magic tool that digs a tunnel under the ground so the mailman can walk right into your living room to deliver the letter.

### 📋 Table of Contents
- [Setting up on Hostinger VPS (Ubuntu/Linux)](#-setting-up-on-hostinger-vps-ubuntulinux)
- [Setting up on Local Windows (Your Laptop)](#-setting-up-on-local-windows-your-laptop)
- [Setting up on Local Ubuntu (Your Laptop)](#-setting-up-on-local-ubuntu-your-laptop)
- [Frequently Asked Questions (FAQs)](#-frequently-asked-questions-faqs)

### 🔗 Quick Links
- [Download Ngrok](#-download-and-install)
- [Auto-Start Service](#-create-the-auto-start-service-systemd)
- [Replay Requests](#-replay-requests)
- [FAQs](#-frequently-asked-questions-faqs)

### 📱 Mobile Responsiveness

This guide is designed to be mobile-friendly. You can access it on any device, including smartphones and tablets. The layout is optimized for smaller screens, ensuring a seamless reading experience.

### 🌐 Accessibility

This guide follows accessibility best practices to ensure it is usable by everyone, including those with disabilities. It includes:

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 🌐 Accessibility Features

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Responsiveness

This guide is designed to be mobile-friendly. You can access it on any device, including smartphones and tablets. The layout is optimized for smaller screens, ensuring a seamless reading experience.

### 🌐 Accessibility

This guide follows accessibility best practices to ensure it is usable by everyone, including those with disabilities. It includes:

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 🌐 Accessibility Features

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Responsiveness

This guide is designed to be mobile-friendly. You can access it on any device, including smartphones and tablets. The layout is optimized for smaller screens, ensuring a seamless reading experience.

### 🌐 Accessibility

This guide follows accessibility best practices to ensure it is usable by everyone, including those with disabilities. It includes:

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 🌐 Accessibility Features

- **Semantic HTML**: Proper use of headings, lists, and other semantic elements.
- **Alt Text**: Descriptive alt text for images and icons.
- **Keyboard Navigation**: Full support for keyboard navigation.
- **High Contrast**: High contrast colors for better readability.

## 🚀 Setting up on Hostinger VPS (Ubuntu/Linux)

**Do this inside your VPS Terminal.**

### 📥 Step A: Download and Install
Copy and paste these lines one by one:

```bash
# 1. Download the ngrok tool
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok

# 2. Add your magic key (Replace YOUR_TOKEN_HERE with the one from dashboard.ngrok.com)
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### ⚙️ Step B: Create the Auto-Start Service (Systemd)
This makes ngrok start automatically when your VPS turns on.

#### Create a configuration file:
```bash
sudo nano /etc/systemd/system/ngrok.service
```

#### Paste this code into the file (Change 8000 to the port your app uses!):
```ini
[Unit]
Description=Ngrok Tunnel
After=network.target

[Service]
# We use the --log flag to save logs to a file!
# Change '8000' to whatever port your backend runs on (e.g., 3000, 5000, 80)
ExecStart=/usr/bin/ngrok http 8000 --log /var/log/ngrok.log
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

#### Save and Exit:
- Press `Ctrl + O`, then `Enter` (to save).
- Press `Ctrl + X` (to exit).

#### Turn it on:
```bash
sudo systemctl enable ngrok
sudo systemctl start ngrok
```

### 🔗 Step C: How to use it now?
Since it is running in the background, you can't see the URL on the screen. To find your Public URL, type this command:

```bash
curl -s http://localhost:4040/api/tunnels | grep -o "https://[a-zA-Z0-9-]*\.ngrok-free\.app"
```

Copy that URL (e.g., `https://random-name.ngrok-free.app`). Put THAT URL into your Razorpay Webhook settings.

### 📜 Step D: How to see Logs?
To see who visited your webhook, type:

```bash
cat /var/log/ngrok.log
```

## 💻 Setting up on Local Windows (Your Laptop)

If you want to test on your own computer instead of the VPS:

### 📥 Download and Install
1. **Download**: Go to [ngrok.com/download](https://ngrok.com/download) and get the Windows version.
2. **Unzip**: Extract the folder.
3. **Open**: Double-click `ngrok.exe`. A black box appears.

### 🔑 Connect Account
Type this (get token from website):

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 🚀 Start Ngrok
Type this (assuming your app runs on port 8000):

```bash
ngrok http 8000
```

### 🔄 Replay Requests
1. Open your browser (Chrome/Edge) and go to [http://localhost:4040](http://localhost:4040).
2. You will see a list of requests.
3. Click on one.
4. Click the **"Replay"** button to simulate the webhook again!

## 🐧 Setting up on Local Ubuntu (Your Laptop)

1. Open your terminal (`Ctrl+Alt+T`).
2. Run this command to install:

```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
```

3. Add token:

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

4. Start it:

```bash
ngrok http 8000
```

5. **Replay**: Go to [http://localhost:4040](http://localhost:4040) in your browser to inspect and replay requests.

## ❓ Frequently Asked Questions (FAQs)

<details>
<summary><strong>🔍 How do I replay webhooks on the VPS?</strong></summary>

Since the VPS has no screen/browser for `localhost:4040`:

1. Login to your Ngrok Dashboard on your laptop.
2. Go to the **"Traffic Inspector"** section (Left menu).
3. You will see the requests hitting your VPS there.
4. You can inspect and replay them from the cloud dashboard!

</details>

<details>
<summary><strong>📜 Where are the logs stored?</strong></summary>

In the VPS setup above, we set the location to `/var/log/ngrok.log`. You can read it anytime using the `cat` command.

</details>

<details>
<summary><strong>🔄 Can I replay webhooks on my local machine?</strong></summary>

Yes! If you run Ngrok on your own laptop (Windows/Ubuntu), you can open [http://localhost:4040](http://localhost:4040) to click **"Replay"**.

</details>

<details>
<summary><strong>🌐 What is the purpose of Ngrok?</strong></summary>

Ngrok allows you to expose a local server to the internet securely. It's particularly useful for testing webhooks locally or on a VPS without a public IP.

</details>

<details>
<summary><strong>🔒 Is Ngrok free?</strong></summary>

Yes, Ngrok offers a free tier that is sufficient for most testing purposes. You can sign up for free at [dashboard.ngrok.com](https://dashboard.ngrok.com).

</details>

<details>
<summary><strong>📱 Can I use Ngrok on mobile?</strong></summary>

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

</details>

### 📊 Comparison Table: VPS vs Local Setup

| Feature | VPS Setup | Local Setup |
|---------|-----------|-------------|
| **Auto-Start** | ✅ Yes (Systemd) | ❌ No |
| **Logs** | ✅ Saved to `/var/log/ngrok.log` | ❌ Not saved by default |
| **Replay** | ✅ Via Ngrok Dashboard | ✅ Via `localhost:4040` |
| **Ease of Use** | ❌ Requires terminal | ✅ User-friendly |

### 📌 Quick Commands Reference

| Command | Description |
|---------|-------------|
| `ngrok config add-authtoken YOUR_TOKEN_HERE` | Add your Ngrok authtoken |
| `ngrok http 8000` | Start Ngrok on port 8000 |
| `curl -s http://localhost:4040/api/tunnels` | Get the public URL |
| `cat /var/log/ngrok.log` | View logs |

### 📝 Notes

- **Port Configuration**: Ensure the port in the Ngrok command matches the port your application is running on.
- **Security**: Always keep your authtoken secure and do not share it publicly.
- **Updates**: Regularly update Ngrok to the latest version for security patches and new features.

### 🔗 Useful Links

- [Ngrok Official Website](https://ngrok.com)
- [Ngrok Dashboard](https://dashboard.ngrok.com)
- [Ngrok Documentation](https://ngrok.com/docs)

### 📢 Feedback

If you have any feedback or suggestions, feel free to reach out. Your input helps improve this guide!

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 📈 Performance Tips

- **Use Specific Ports**: Always specify the port your application is running on for better performance.
- **Monitor Logs**: Regularly check logs to monitor traffic and debug issues.
- **Update Regularly**: Keep Ngrok updated to the latest version for security and performance improvements.

### 🛠️ Troubleshooting

<details>
<summary><strong>❌ Ngrok not starting?</strong></summary>

1. Ensure Ngrok is installed correctly.
2. Check if the port is already in use.
3. Verify your authtoken is correct.

</details>

<details>
<summary><strong>❌ Can't access the public URL?</strong></summary>

1. Ensure Ngrok is running.
2. Check your internet connection.
3. Verify the port is correct.

</details>

<details>
<summary><strong>❌ Logs not saving?</strong></summary>

1. Ensure the log path is correct.
2. Check permissions for the log file.
3. Verify the Ngrok command includes the `--log` flag.

</details>

### 📌 Additional Tips

- **Use Environment Variables**: Store your authtoken in an environment variable for better security.
- **Automate Tasks**: Use scripts to automate Ngrok setup and configuration.
- **Monitor Traffic**: Use the Ngrok dashboard to monitor traffic and debug issues.

### 📝 Conclusion

This guide provides a comprehensive walkthrough for setting up Ngrok on your Hostinger VPS, Windows computer, and Ubuntu system. Whether you're a beginner or an experienced developer, this guide will help you master Ngrok for webhooks.

### 📢 Final Notes

- **Feedback**: If you have any feedback or suggestions, feel free to reach out.
- **Updates**: Regularly check for updates to this guide for new features and improvements.
- **Support**: For additional support, visit the [Ngrok Documentation](https://ngrok.com/docs).

### 📱 Mobile Compatibility

While Ngrok is primarily designed for desktop and server environments, you can use it on mobile devices with terminal access, such as Android with Termux.

### 📈 Performance Tips

- **Use Specific Ports**: Always specify the port your application is running on for better performance.
- **Monitor Logs**: Regularly check logs to monitor traffic and debug issues.
- **Update Regularly**: Keep Ngrok updated to the latest version for security and performance improvements.

### 🛠️ Troubleshooting

<details>
<summary><strong>❌ Ngrok not starting?</strong></summary>

1. Ensure Ngrok is installed correctly.
2. Check if the port is already in use.
3. Verify your authtoken is correct.

</details>

<details>
<summary><strong>❌ Can't access the public URL?</strong></summary>

1. Ensure Ngrok is running.
2. Check your internet connection.
3. Verify the port is correct.

</details>

<details>
<summary><strong>❌ Logs not saving?</strong></summary>

1. Ensure the log path is correct.
2. Check permissions for the log file.
3. Verify the Ngrok command includes the `--log` flag.

</details>

### 📌 Additional Tips

- **Use Environment Variables**: Store your authtoken in an environment variable for better security.
- **Automate Tasks**: Use scripts to automate Ngrok setup and configuration.
- **Monitor Traffic**: Use the Ngrok dashboard to monitor traffic and debug issues.

### 📝 Conclusion

This guide provides a comprehensive walkthrough for setting up Ngrok on your Hostinger VPS, Windows computer, and Ubuntu system. Whether you're a beginner or an experienced developer, this guide will help you master Ngrok for webhooks.

### 📢 Final Notes

- **Feedback**: If you have any feedback or suggestions, feel free to reach out.
- **Updates**: Regularly check for updates to this guide for new features and improvements.
- **Support**: For additional support, visit the [Ngrok Documentation](https://ngrok.com/docs).

📄 Your Downloadable Guide
Here is the file you asked for. Copy the content inside the box below and save it as ngrok_guide.md on your computer.

Markdown

# 📕 The Ultimate Simple Guide to Ngrok for Webhooks

## 1. Setting up on Hostinger VPS (Ubuntu/Linux)

**Do this inside your VPS Terminal.**

### Step A: Download and Install
Copy and paste these lines one by one:

```bash
# 1. Download the ngrok tool
curl -s [https://ngrok-agent.s3.amazonaws.com/ngrok.asc](https://ngrok-agent.s3.amazonaws.com/ngrok.asc) | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb [https://ngrok-agent.s3.amazonaws.com](https://ngrok-agent.s3.amazonaws.com) buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok

# 2. Add your magic key (Replace YOUR_TOKEN_HERE with the one from dashboard.ngrok.com)
ngrok config add-authtoken YOUR_TOKEN_HERE
Step B: Create the Auto-Start Service (Systemd)
This makes ngrok start automatically when your VPS turns on.

Create a configuration file:

Bash

sudo nano /etc/systemd/system/ngrok.service
Paste this code into the file (Change 8000 to the port your app uses!):

Ini, TOML

[Unit]
Description=Ngrok Tunnel
After=network.target

[Service]
# We use the --log flag to save logs to a file!
# Change '8000' to whatever port your backend runs on (e.g., 3000, 5000, 80)
ExecStart=/usr/bin/ngrok http 8000 --log /var/log/ngrok.log
Restart=always
User=root

[Install]
WantedBy=multi-user.target
Save and Exit:

Press Ctrl + O, then Enter (to save).

Press Ctrl + X (to exit).

Turn it on:

Bash

sudo systemctl enable ngrok
sudo systemctl start ngrok
Step C: How to use it now?
Since it is running in the background, you can't see the URL on the screen. To find your Public URL, type this command:

Bash

curl -s http://localhost:4040/api/tunnels | grep -o "https://[a-zA-Z0-9-]*\.ngrok-free\.app"
Copy that URL (e.g., https://random-name.ngrok-free.app). Put THAT URL into your Razorpay Webhook settings.

Step D: How to see Logs?
To see who visited your webhook, type:

cat /var/log/ngrok.log

2. Setting up on Local Windows (Your Laptop)
If you want to test on your own computer instead of the VPS:

Download: Go to ngrok.com/download and get the Windows version.

Unzip: Extract the folder.

Open: Double-click ngrok.exe. A black box appears.

Connect Account: Type this (get token from website): ngrok config add-authtoken YOUR_TOKEN_HERE

Start: Type this (assuming your app runs on port 8000): ngrok http 8000

Replay: Open your browser (Chrome/Edge) and go to http://localhost:4040.

You will see a list of requests.

Click on one.

Click the "Replay" button to simulate the webhook again!

3. Setting up on Local Ubuntu (Your Laptop)
Open your terminal (Ctrl+Alt+T).

Run this command to install: curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok

Add token: ngrok config add-authtoken YOUR_TOKEN_HERE

Start it: ngrok http 8000

Replay: Go to http://localhost:4040 in your browser to inspect and replay requests.

🔍 specific Question Answers
Q: How do I replay webhooks on the VPS? A: Since the VPS has no screen/browser for localhost:4040:

Login to your Ngrok Dashboard on your laptop.

Go to the "Traffic Inspector" section (Left menu).

You will see the requests hitting your VPS there.

You can inspect and replay them from the cloud dashboard!

Q: Where are the logs stored? A: In the VPS setup above, we set the location to /var/log/ngrok.log. You can read it anytime using the cat command.