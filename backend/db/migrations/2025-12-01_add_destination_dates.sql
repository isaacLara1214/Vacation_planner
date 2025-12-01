ALTER TABLE `Destination`
  ADD COLUMN `Start_Date` DATE NULL AFTER `Country`,
  ADD COLUMN `End_Date` DATE NULL AFTER `Start_Date`;