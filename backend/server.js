const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
      message: "HABITAWATCH Backend is running"
        });
        });

        app.post("/api/analyze", (req, res) => {
          const {
              area,
                  vegetationBefore,
                      vegetationAfter,
                          forestBefore,
                              forestAfter,
                                  waterBefore,
                                      waterAfter,
                                          urbanBefore,
                                              urbanAfter
                                                } = req.body;

                                                  if (!area) {
                                                      return res.status(400).json({
                                                            error: "Area is required"
                                                                });
                                                                  }

                                                                    const vegetationLoss = vegetationBefore - vegetationAfter;
                                                                      const deforestation = forestBefore - forestAfter;
                                                                        const waterChange = waterBefore - waterAfter;
                                                                          const urbanExpansion = urbanAfter - urbanBefore;

                                                                            res.json({
                                                                                area,
                                                                                    vegetationLoss,
                                                                                        deforestation,
                                                                                            waterChange,
                                                                                                urbanExpansion
                                                                                                  });
                                                                                                  });

                                                                                                  app.listen(5000, () => {
                                                                                                    console.log("HABITAWATCH Backend running on port 5000");
                                                                                                    });