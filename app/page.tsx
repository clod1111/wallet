"use client";

import { useState } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum: any;
  }
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [network, setNetwork] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask first");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      const address = accounts[0];

      setWalletAddress(address);

      const walletBalance =
        await provider.getBalance(address);

      setBalance(
        ethers.formatEther(walletBalance)
      );

      const networkData =
        await provider.getNetwork();

      setNetwork(networkData.name);

    } catch (error) {
      console.log(error);
      setStatus("Wallet connection failed.");
    }
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    alert("Address copied!");
  }

  async function sendETH() {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask first");
        return;
      }

      if (!toAddress || !amount) {
        alert("Enter recipient and amount.");
        return;
      }

      const provider =
        new ethers.BrowserProvider(window.ethereum);

      const signer =
        await provider.getSigner();

      setStatus(
        "Waiting for wallet confirmation..."
      );

      const tx =
        await signer.sendTransaction({
          to: toAddress,
          value: ethers.parseEther(amount),
        });

      setStatus(
        "Transaction sent: " + tx.hash
      );

      await tx.wait();

      setStatus(
        "Transaction confirmed!"
      );

      const newBalance =
        await provider.getBalance(
          walletAddress
        );

      setBalance(
        ethers.formatEther(newBalance)
      );

    } catch (error) {
      console.log(error);
      setStatus(
        "Transaction failed or cancelled."
      );
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        fontFamily: "Arial",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "120px",
      }}
    >
      <h1 style={{ fontSize: "48px" }}>
        My Crypto Wallet App
      </h1>

      <button
        onClick={connectWallet}
        style={{
          marginTop: "30px",
          padding: "12px 24px",
          borderRadius: "12px",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
        }}
      >
        Connect MetaMask
      </button>

      {walletAddress && (
        <div
          style={{
            marginTop: "30px",
            padding: "25px",
            borderRadius: "18px",
            background: "#1e293b",
            textAlign: "center",
            width: "360px",
          }}
        >
          <p>
            Connected:{" "}
            {walletAddress.slice(0, 6)}
           ...
            {walletAddress.slice(-4)}
          </p>

          <p>
            Balance: {balance} ETH
          </p>

          <p>
            Network: {network}
          </p>

          <button
            onClick={copyAddress}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Copy Address
          </button>
        </div>
      )}

      {walletAddress && (
        <div
          style={{
            marginTop: "25px",
            padding: "25px",
            borderRadius: "18px",
            background: "#1e293b",
            width: "360px",
            textAlign: "center",
          }}
        >
          <h2>Send ETH</h2>

          <input
            value={toAddress}
            onChange={(e) =>
              setToAddress(e.target.value)
            }
            placeholder="Recipient address"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "10px",
              borderRadius: "10px",
              border: "none",
            }}
          />

          <input
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            placeholder="Amount in ETH"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "10px",
              borderRadius: "10px",
              border: "none",
            }}
          />

          <button
            onClick={sendETH}
            style={{
              marginTop: "15px",
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Send ETH
          </button>

          {status && (
            <p
              style={{
                marginTop: "15px",
                fontSize: "14px",
              }}
            >
              {status}
            </p>
          )}
        </div>
      )}
    </main>
  );
}