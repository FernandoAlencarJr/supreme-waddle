import type { NextApiRequest, NextApiResponse, PageConfig } from "next";
import formidable from "formidable";
import fs from "fs";
import S3Service from "@/services/aws/s3";
import { PrismaClient } from "@prisma/client";

const formidableConfig: formidable.Options = {
  uploadDir: "./",
  keepExtensions: true,
};

function formidablePromise(
  req: NextApiRequest,
  opts?: Parameters<typeof formidable>[0]
): Promise<{
  fields: {
    email: string;
    cpf: string;
    fullName: string;
    cellphone: string;
    longitude: string;
    latitude: string;
    cityCountry: string;
    cityName: string;
    cityRegion: string;
  };
  files: formidable.Files;
}> {
  return new Promise((accept, reject) => {
    const form = formidable(opts);

    form.parse(req, (err, fields: any, files) => {
      if (err) {
        return reject(err);
      }
      return accept({ fields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const prisma = new PrismaClient();

    try {
      const { fields, files } = await formidablePromise(req, {
        ...formidableConfig,
        filename: (name, ext, part, form) => {
          return (name += ext);
        },
      });

      const fileName = new Map(Object.entries(files["file"])).get(
        "originalFilename"
      );

      const fileContent = fs.readFileSync(fileName);

      const awsS3Service = new S3Service();

      const uploadedObject = await awsS3Service.uploadObjects(
        fileContent,
        fileName
      );

      const users = await prisma.user.findFirst({
        where: {
          OR: [
            { cpf: fields.cpf },
            { email: fields.email },
            { cellphone: fields.cellphone },
          ],
        },
      });

      if (
        (users && fields.email !== users.email) ||
        (users && fields.cpf !== users.cpf) ||
        (users && fields.cellphone !== users.cellphone)
      ) {
        return res
          .status(500)
          .json({ message: "already exist user for this information" });
      }

      let user = await prisma.user.findFirst({
        where: {
          cpf: fields.cpf,
          email: fields.email,
          cellphone: fields.cellphone,
        },
      });

      let document;
      let location;
      if (!user) {
        const userCreated = await prisma.user.create({
          data: {
            name: fields.fullName,
            cpf: fields.cpf,
            email: fields.email,
            cellphone: fields.cellphone,
          },
        });

        if (userCreated) user = userCreated;
      }

      if (user) {
        document = await prisma.document.create({
          data: {
            originalKey: uploadedObject?.archiveKey || "",
            subscriberId: user.id,
          },
        });
        location = await prisma.location.create({
          data: {
            longitude: fields.longitude,
            latitude: fields.latitude,
            cityRegion: fields.cityRegion,
            cityName: fields.cityName,
            cityCountry: fields.cityCountry,
            userId: user.id,
          },
        });
      }
      prisma.$disconnect();

      return res.json({ document, location, user });
    } catch (e) {
      console.log(e);
      return res.status(500).json({});
    }
  }
}

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};
