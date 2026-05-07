"use client";

import { useState } from "react";
import { ethers } from "ethers";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [network, setNetwork] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  async function connectWallet() {
    try {
      if (!(window as any).ethereum) {
        alert("Install MetaMask first");
        return;
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      setWalletAddress(address);

      const walletBalance = await provider.getBalance(address);
      setBalance(Number(ethers.formatEther(walletBalance)).toFixed(6));

      const networkData = await provider.getNetwork();
      setNetwork(networkData.name);
      setStatus("Wallet connected successfully.");
    } catch (error) {
      console.log(error);
      setStatus("Wallet connection failed.");
    }
  }

  function disconnectWallet() {
    setWalletAddress("");
    setBalance("");
    setNetwork("");
    setToAddress("");
    setAmount("");
    setStatus("Wallet disconnected.");
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setStatus("Address copied.");
  }

  async function refreshBalance() {
    try {
      if (!(window as any).ethereum || !walletAddress) return;

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const walletBalance = await provider.getBalance(walletAddress);
      setBalance(Number(ethers.formatEther(walletBalance)).toFixed(6));
      setStatus("Balance refreshed.");
    } catch (error) {
      console.log(error);
      setStatus("Could not refresh balance.");
    }
  }

  async function sendETH() {
    try {
      if (!(window as any).ethereum) {
        alert("Install MetaMask first");
        return;
      }

      if (!ethers.isAddress(toAddress)) {
        alert("Enter a valid recipient address.");
        return;
      }

      if (!amount || Number(amount) <= 0) {
        alert("Enter a valid ETH amount.");
        return;
      }

      const confirmSend = confirm(
        `Send ${amount} ETH to ${toAddress}? This can use real money if you are on mainnet.`
      );

      if (!confirmSend) return;

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      setStatus("Waiting for wallet confirmation...");

      const tx = await signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount),
      });

      setStatus("Transaction sent: " + tx.hash);

      await tx.wait();

      setStatus("Transaction confirmed.");
      await refreshBalance();
      setToAddress("");
      setAmount("");
    } catch (error) {
      console.log(error);
      setStatus("Transaction failed or cancelled.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1e3a8a 0%, #0f172a 45%, #020617 100%)",
        color: "white",
        fontFamily: "Arial",
        padding: "40px 20px",
      }}
    >
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#38bdf8", fontWeight: "bold" }}>
          Web3 Wallet Dashboard
        </p>

        <h1 style={{ fontSize: "52px", marginBottom: "10px" }}>
          My Crypto Wallet App
        </h1>

        <p style={{ color: "#cbd5e1", marginBottom: "30px" }}>
          Connect your wallet, check your balance, and send ETH safely.
        </p>

        {!walletAddress ? (
          <button onClick={connectWallet} style={primaryButton}>
            Connect MetaMask
          </button>
        ) : (
          <button onClick={disconnectWallet} style={dangerButton}>
            Disconnect Wallet
          </button>
        )}

        {walletAddress && (
          <div style={grid}>
            <div style={card}>
              <h2>Wallet</h2>

              <p style={label}>Address</p>
              <p style={value}>
                {walletAddress.slice(0, 6)}...
                {walletAddress.slice(-4)}
              </p>

              <p style={label}>Balance</p>
              <p style={bigValue}>{balance} ETH</p>

              <p style={label}>Network</p>
              <p style={value}>{network}</p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button onClick={copyAddress} style={smallButton}>
                  Copy
                </button>

                <button onClick={refreshBalance} style={smallButton}>
                  Refresh
                </button>
              </div>
            </div>

            <div style={card}>
              <h2>Send ETH</h2>

              <input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Recipient address"
                style={input}
              />

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount in ETH"
                style={input}
              />

              <button onClick={sendETH} style={primaryButton}>
                Send ETH
              </button>

              <p style={{ color: "#fbbf24", fontSize: "13px", marginTop: "15px" }}>
                Be careful: mainnet transactions use real crypto.
              </p>
            </div>
          </div>
        )}

        {status && (
          <div style={statusBox}>
            {status}
          </div>
        )}
      </section>
    </main>
  );
}

const card = {
  background: "rgba(30, 41, 59, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "22px",
  padding: "28px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "24px",
  marginTop: "35px",
};

const primaryButton = {
  background: "#38bdf8",
  color: "#020617",
  border: "none",
  padding: "13px 24px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
};

const dangerButton = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "13px 24px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
};

const smallButton = {
  background: "#334155",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "12px",
  cursor: "pointer",
};

const input = {
  width: "100%",
  padding: "14px",
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid #475569",
  background: "#0f172a",
  color: "white",
};

const label = {
  color: "#94a3b8",
  fontSize: "13px",
  marginTop: "18px",
};

const value = {
  fontSize: "18px",
};

const bigValue = {
  fontSize: "30px",
  fontWeight: "bold",
};

const statusBox = {
  marginTop: "30px",
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "14px",
  padding: "15px",
  color: "#cbd5e1",
};