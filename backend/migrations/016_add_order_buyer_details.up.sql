ALTER TABLE orders
  ADD COLUMN buyer_name         VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN buyer_email        VARCHAR(254) NOT NULL DEFAULT '',
  ADD COLUMN buyer_cpf          VARCHAR(14)  NOT NULL DEFAULT '',
  ADD COLUMN buyer_phone        VARCHAR(30)  NOT NULL DEFAULT '',
  ADD COLUMN buyer_cep          VARCHAR(9)   NOT NULL DEFAULT '',
  ADD COLUMN buyer_street       VARCHAR(300) NOT NULL DEFAULT '',
  ADD COLUMN buyer_neighborhood VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN buyer_city         VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN buyer_state        VARCHAR(2)   NOT NULL DEFAULT '';
