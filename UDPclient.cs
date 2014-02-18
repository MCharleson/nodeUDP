// ==================================================
// In Unity, create empty gameobject in hierarchy
// called UDP, attach this script to it.
// This program sends/receives messages using the UDP 
// protocol. Tailor to your needs - this version sends
// any queued messages it finds from in gamemanager.js
// and sends to server. Any messages received from server
// is passed to gamemanager for processing.
// ==================================================
using UnityEngine;
using System.Collections;
using System;
using System.Net;
using System.Text;
using System.Net.Sockets;
using System.Threading;
public class UDPclient : MonoBehaviour {
	Socket sckCommunication;
	EndPoint epLocal, epRemote;
	string txtLocalIp;
	string txtServerIp;
	int txtLocalPort;
	int txtServerPort;
	int delay=200;
	string receivedUDPmessage;
	GameObject gameman;
	gamemanager gm;
	string txtgui;
	byte[] buffer;
	int numberBytes;
  // =================================
	void Start () {
		numberBytes=1464;
   	print("UDPmanager start...");
    // =================
		gameman = GameObject.Find ("GameManager");
		gm=gameman.GetComponent<gamemanager>();
    // =================
		Application.runInBackground = true;
		// set up socket
		sckCommunication = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
		sckCommunication.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);

		txtLocalIp=gm.clientIp;
		txtLocalIp=GetLocalIP();

		txtServerIp=gm.serverIp;
		
		txtLocalPort=gm.clientPort;

		txtServerPort=gm.serverPort;

		txtLocalPort=new System.Random().Next( 50000, 51000);

		txtgui="port="+txtLocalPort+','+txtLocalIp;
		// bind socket                        
		epLocal = new IPEndPoint(IPAddress.Parse(txtLocalIp), txtLocalPort);
		sckCommunication.Bind(epLocal);
		
		// connect to remote ip and port 
		epRemote = new IPEndPoint(IPAddress.Parse(txtServerIp), txtServerPort);
		sckCommunication.Connect(epRemote);
		
		// starts to listen to an specific port
		print("UDPmanager listening on port "+gm.clientPort);

		//buffer = new byte[numberBytes];
		buffer = new byte[numberBytes];


		sckCommunication.BeginReceiveFrom(buffer, 0, buffer.Length, SocketFlags.None,
		                                  ref epRemote, new AsyncCallback(OperatorCallBack), buffer);

	}
	// Update is called once per frame
	void Update () {
    if (gm.qmessage!="") {
      //print("UDPmanager found message :"+gm.qmessage);
      sendmsg(gm.qmessage);
      gm.qmessage="";
    }
    if (receivedUDPmessage!="") {
      //print("UDPmanager received message :"+ receivedUDPmessage);
      gm.udpstring(receivedUDPmessage);
      receivedUDPmessage="";
    } 
	}
	void OnGUI () {
		GUI.Label(new Rect (25, 25, 400, 150), txtgui);
	}
	private string GetLocalIP()
	{
		IPHostEntry host;
		host = Dns.GetHostEntry(Dns.GetHostName());
		foreach (IPAddress ip in host.AddressList)
		{
			if (ip.AddressFamily == AddressFamily.InterNetwork)
			{
				return ip.ToString();
			}
		}
		return "192.168.0.11";
	}

	private void OperatorCallBack(IAsyncResult ar)
	{

		try
		{
			int size = sckCommunication.EndReceiveFrom(ar, ref epRemote);
			
			// check if theres actually information
			if (size > 0)
			{
				// used to help us on getting the data
				byte[] aux = new byte[numberBytes];
				
				// gets the data
				aux = (byte[])ar.AsyncState;
				
				// converts from data[] to string
				System.Text.ASCIIEncoding enc = new System.Text.ASCIIEncoding();
				string msg = enc.GetString(aux);
				receivedUDPmessage=msg;
				// adds to listbox
				//listBox1.Items.Add("Friend: " + msg);                   
				//print("Friend: " + msg);

			}
			
			// starts to listen 
			//buffer = new byte[numberBytes];
			buffer = new byte[numberBytes];

			sckCommunication.BeginReceiveFrom(buffer, 0, buffer.Length, SocketFlags.None,
			                                  ref epRemote, new AsyncCallback(OperatorCallBack), buffer);
		}
		catch (Exception exp)
		{
			print(exp.ToString());
			txtgui+=exp.ToString();
		}
	}
	private void sendmsg(string themessage) {                      
		// converts from string to byte[]
		System.Text.ASCIIEncoding enc = new System.Text.ASCIIEncoding();
		//byte[] msg = new byte[numberBytes];
		byte[] msg = new byte[numberBytes];

		msg = enc.GetBytes(themessage);
		// sending the message
		sckCommunication.Send(msg);
	}
}
