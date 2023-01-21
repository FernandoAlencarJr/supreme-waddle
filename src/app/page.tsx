"use client";

import React from "react";
import axios from "axios";
import styles from "./page.module.css";

interface IUserFields {
  fullName: string;
  email: string;
  cpf: string;
  latitude?: number | null;
  longitude?: number | null;
  cityName: string | null;
  cityCountry: string | null;
  cityRegion: string | null;
}

export default function Home() {
  const [file, setFile] = React.useState<FileList | null>();
  const [isLoading, setLoading] = React.useState<boolean>(false);

  const [originalDocument, setOriginalDocument] = React.useState<string>();
  const [userFields, setUserFields] = React.useState<IUserFields>({
    fullName: "",
    email: "",
    cpf: "",
    latitude: null,
    longitude: null,
    cityName: null,
    cityCountry: null,
    cityRegion: null,
  });

  React.useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const { latitude, longitude } = coords;
        fetchApiData({ latitude, longitude });
      });
    }
  }, []);

  const fetchApiData = async ({ latitude, longitude }) => {
    const options = {
      method: "GET",
      url: `${process.env.NEXT_PUBLIC_X_RAPIDAPI_URL}/v1/geo/locations/${latitude}${longitude}/nearbyDivisions`,
      params: { radius: "100" },
      headers: {
        "X-RapidAPI-Key": process.env.NEXT_PUBLIC_X_RAPIDAPI_KEY,
        "X-RapidAPI-Host": process.env.NEXT_PUBLIC_X_RAPIDAPI_HOST,
      },
    };

    axios
      .request(options)
      .then(function (response) {
        if (response.data.length !== 0) {
          const city = response.data.data[0];
          setUserFields((prev) => ({
            ...prev,
            cityCountry: city.country,
            cityName: city.name,
            cityRegion: city.region,
            latitude,
            longitude,
          }));
        }
      })
      .catch(function (error) {
        window.alert("habilite a localização para assinatura qualificada");
        console.error(error);
      });
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      if (file) {
        const formData = new FormData();

        Object.entries(file).forEach(([key, value]) => {
          formData.set("file", value);
        });

        Object.entries(userFields).forEach(([key, value]) => {
          formData.set(key, value);
        });

        const { data: uploadDocument } = await axios("/api/signature", {
          data: formData,
          method: "POST",
          headers: {
            "content-type": "multipart/form-data",
          },
        });

        setOriginalDocument(uploadDocument);
      }
    } catch (error) {
      window.alert(
        error?.response?.message ||
          "não foi possível criar o usuário ou dar o começo na assinatura deste documento"
      );
    }
  };

  const handleUserFormSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const changeFieldValue = React.useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      key: "email" | "cpf" | "fullName" | "cellphone"
    ) => {
      setUserFields((prev) => ({
        ...prev,
        [key]: e.target.value,
      }));
    },
    []
  );

  return (
    <main className={styles.main}>
      <form onSubmit={handleUserFormSubmit}>
        <label htmlFor="name">Nome Completo</label>
        <input
          type="text"
          id="name"
          required
          onChange={(event) => changeFieldValue(event, "fullName")}
        />
        <label htmlFor="cpf">CPF</label>
        <input
          type="text"
          id="cpf"
          required
          onChange={(event) => changeFieldValue(event, "cpf")}
        />
        <label htmlFor="email">Email</label>
        <input
          type="text"
          id="email"
          required
          onChange={(event) => changeFieldValue(event, "email")}
        />
        <label htmlFor="cellphone">Telefone celular</label>
        <input
          type="text"
          id="cellphone"
          required
          onChange={(event) => changeFieldValue(event, "cellphone")}
        />
        {/*        <button type="submit">confirmar</button> */}
      </form>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          name="file"
          onChange={(e) => setFile(e.target.files)}
          accept=".pdf"
        />
        {originalDocument && (
          <object data={originalDocument} width="500" height="500"></object>
        )}
        <button type="submit">submit</button>
      </form>
    </main>
  );
}
