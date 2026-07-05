-- MySQL dump 10.13  Distrib 8.4.10, for Linux (x86_64)
--
-- Host: localhost    Database: iam
-- ------------------------------------------------------
-- Server version	8.4.10

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `iam`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `iam` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `iam`;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) NOT NULL,
  `provider_id` varchar(50) NOT NULL,
  `account_id` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` datetime(3) DEFAULT NULL,
  `scope` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_account_provider` (`provider_id`,`account_id`),
  KEY `IDX_efef1e5fdbe318a379c06678c5` (`user_id`),
  CONSTRAINT `FK_efef1e5fdbe318a379c06678c51` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_key`
--

DROP TABLE IF EXISTS `api_key`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_key` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `key_prefix` varchar(16) NOT NULL,
  `key_hash` varchar(255) NOT NULL,
  `user_id` char(26) DEFAULT NULL,
  `application_id` char(26) DEFAULT NULL,
  `scopes` json DEFAULT NULL,
  `expires_at` datetime(3) DEFAULT NULL,
  `last_used_at` datetime(3) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_3c9751d2a6011ba13e27838105` (`key_hash`),
  KEY `IDX_ec8811341f6ef3abde5a86cc5a` (`key_prefix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application`
--

DROP TABLE IF EXISTS `application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'web',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_b38d2078e7b3cf3306b674eea7` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_menu`
--

DROP TABLE IF EXISTS `application_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_menu` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `application_id` char(26) NOT NULL,
  `parent_id` char(26) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `path` varchar(200) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `sort` int NOT NULL DEFAULT '0',
  `permission_code` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_6d0f3ec6d803cdc6aa60be2be1` (`application_id`),
  KEY `IDX_8d632e63e9e01bd0c7e4b926c3` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_role`
--

DROP TABLE IF EXISTS `application_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_role` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `application_id` char(26) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `access_role_id` char(26) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_role` (`application_id`,`code`),
  KEY `IDX_33b4978d77c826f9c576c37370` (`application_id`),
  KEY `IDX_application_role_access_role_id` (`access_role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_setting`
--

DROP TABLE IF EXISTS `application_setting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_setting` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `application_id` char(26) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_setting` (`application_id`,`config_key`),
  KEY `IDX_9e793d124d6e22de687d265e28` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `application_user`
--

DROP TABLE IF EXISTS `application_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_user` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `application_id` char(26) NOT NULL,
  `user_id` char(26) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `granted_at` datetime(3) DEFAULT NULL,
  `application_role_id` char(26) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_user` (`application_id`,`user_id`),
  KEY `IDX_d4c4323febc0956a532e64e4a2` (`application_id`),
  KEY `IDX_8206d2b6a9d680308c207e3567` (`user_id`),
  KEY `IDX_application_user_application_role_id` (`application_role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `actor_id` char(26) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource_type` varchar(50) DEFAULT NULL,
  `resource_id` varchar(64) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `detail` json DEFAULT NULL,
  `result` varchar(20) NOT NULL DEFAULT 'success',
  PRIMARY KEY (`id`),
  KEY `IDX_15a6f5aad57db494c17986ed2e` (`actor_id`),
  KEY `IDX_951e6339a77994dfbad976b35c` (`action`),
  KEY `IDX_4a7f36346480a56b810efea4a2` (`resource_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blacklist`
--

DROP TABLE IF EXISTS `blacklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blacklist` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `type` varchar(20) NOT NULL,
  `value` varchar(255) NOT NULL,
  `reason` varchar(200) DEFAULT NULL,
  `expires_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blacklist_type_value` (`type`,`value`),
  KEY `IDX_44dbf23f8b1109c4eb7c2afd76` (`type`),
  KEY `IDX_b4d6412ab0fab72fe6808bcf5f` (`value`),
  KEY `IDX_0b09a4867f2345095abd97a1b0` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `data_permission`
--

DROP TABLE IF EXISTS `data_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `data_permission` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `role_id` char(26) NOT NULL,
  `resource` varchar(50) NOT NULL,
  `scope` varchar(20) NOT NULL DEFAULT 'self',
  `custom_expr` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_110462cf1db2c8e7cada9f1515` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `organization_id` char(26) NOT NULL,
  `parent_id` char(26) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `code` varchar(50) NOT NULL,
  `path` varchar(500) DEFAULT NULL,
  `leader_employee_id` char(26) DEFAULT NULL,
  `sort` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_department_org_code` (`organization_id`,`code`),
  KEY `IDX_c37a08a62f5d1774d9180a9ff3` (`organization_id`),
  KEY `IDX_110d56d702b0880fe9b005878e` (`parent_id`),
  KEY `IDX_22723a1bf6af45d4066f3180fe` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `device`
--

DROP TABLE IF EXISTS `device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) NOT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `device_type` varchar(20) NOT NULL DEFAULT 'unknown',
  `os` varchar(50) DEFAULT NULL,
  `browser` varchar(50) DEFAULT NULL,
  `fingerprint` varchar(128) DEFAULT NULL,
  `trusted` tinyint NOT NULL DEFAULT '0',
  `last_active_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_ae7154510495c7ddda951b07a0` (`user_id`),
  KEY `IDX_88e6ccf20875fa2c42538d709c` (`fingerprint`),
  CONSTRAINT `FK_ae7154510495c7ddda951b07a07` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dictionary`
--

DROP TABLE IF EXISTS `dictionary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dictionary` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_b1f11f5f4bb7a63eee2583596c` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dictionary_item`
--

DROP TABLE IF EXISTS `dictionary_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dictionary_item` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `dictionary_id` char(26) NOT NULL,
  `label` varchar(100) NOT NULL,
  `value` varchar(100) NOT NULL,
  `sort` int NOT NULL DEFAULT '0',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dictionary_item` (`dictionary_id`,`value`),
  KEY `IDX_1608134a8953de13efe191dd36` (`dictionary_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) NOT NULL,
  `organization_id` char(26) NOT NULL,
  `department_id` char(26) DEFAULT NULL,
  `position_id` char(26) DEFAULT NULL,
  `employee_no` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `hired_at` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employee_org_user` (`organization_id`,`user_id`),
  KEY `IDX_f61258e58ed35475ce1dba0379` (`user_id`),
  KEY `IDX_b5b0a5f2ddc7062bbdded584a1` (`organization_id`),
  KEY `IDX_d62835db8c0aec1d18a5a92754` (`department_id`),
  KEY `IDX_6ab3ec557a640017d53ac0e0ab` (`position_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file`
--

DROP TABLE IF EXISTS `file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `storage_type` varchar(20) NOT NULL,
  `bucket` varchar(100) DEFAULT NULL,
  `object_key` varchar(500) NOT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size` bigint NOT NULL DEFAULT '0',
  `hash` varchar(64) DEFAULT NULL,
  `uploader_id` char(26) DEFAULT NULL,
  `biz_type` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `IDX_218e6e559e7281dd741520ee9c` (`storage_type`),
  KEY `IDX_50da2892bca204d060cf562bdf` (`hash`),
  KEY `IDX_59f35ce6c54e13501ac3474912` (`biz_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login_history`
--

DROP TABLE IF EXISTS `login_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_history` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `success` tinyint NOT NULL,
  `fail_reason` varchar(100) DEFAULT NULL,
  `login_type` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_ad9ce49cb73c0b33746a56b6bd` (`user_id`),
  KEY `IDX_7c03e495294640bd6aaa50adcd` (`ip`),
  KEY `IDX_f1451dc8fc9e81bd78e7430e6e` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login_policy`
--

DROP TABLE IF EXISTS `login_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_policy` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `organization_id` char(26) DEFAULT NULL,
  `min_password_length` int NOT NULL DEFAULT '8',
  `password_complexity` varchar(50) DEFAULT NULL,
  `require_mfa` tinyint NOT NULL DEFAULT '0',
  `max_failed_attempts` int NOT NULL DEFAULT '5',
  `lockout_minutes` int NOT NULL DEFAULT '15',
  `session_ttl_minutes` int NOT NULL DEFAULT '1440',
  `require_captcha` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_1ee657288854df61d49077f841` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `parent_id` char(26) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(100) NOT NULL,
  `path` varchar(200) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `permission_code` varchar(100) DEFAULT NULL,
  `sort` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a15b1f45a3ebfb807137e1287c` (`code`),
  KEY `IDX_e5e28130fd17f88ab5ee5d3aa4` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_log`
--

DROP TABLE IF EXISTS `notification_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_log` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `template_id` char(26) DEFAULT NULL,
  `channel` varchar(20) NOT NULL,
  `recipient` varchar(255) NOT NULL,
  `user_id` char(26) DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `error` varchar(500) DEFAULT NULL,
  `sent_at` datetime(3) DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_fc3d651aaf0a8bfcee0ac2ab8a` (`template_id`),
  KEY `IDX_8d77d2c363cf7e32c3f93a015f` (`channel`),
  KEY `IDX_b1d3b17c446760db94ae3c81a0` (`recipient`),
  KEY `IDX_bbdec870a684a910d0a81e1afe` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_template`
--

DROP TABLE IF EXISTS `notification_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_template` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `code` varchar(100) NOT NULL,
  `channel` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `content` text NOT NULL,
  `variables` json DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notification_template` (`code`,`channel`),
  KEY `IDX_1dadd95f723002cf75436f0afa` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `oauth_client`
--

DROP TABLE IF EXISTS `oauth_client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `oauth_client` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `application_id` char(26) NOT NULL,
  `client_id` varchar(100) NOT NULL,
  `client_secret` varchar(255) NOT NULL,
  `redirect_uris` json NOT NULL,
  `grant_types` json NOT NULL,
  `response_types` json NOT NULL,
  `scopes` json NOT NULL,
  `token_endpoint_auth_method` varchar(50) NOT NULL DEFAULT 'client_secret_basic',
  `require_pkce` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_60380dc2df61082f7fdea603c2` (`application_id`),
  UNIQUE KEY `IDX_120e591449cf7f49569ee6c95b` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `oidc_payload`
--

DROP TABLE IF EXISTS `oidc_payload`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `oidc_payload` (
  `id` varchar(255) NOT NULL,
  `model` varchar(50) NOT NULL,
  `payload` json NOT NULL,
  `grant_id` varchar(255) DEFAULT NULL,
  `user_code` varchar(255) DEFAULT NULL,
  `uid` varchar(255) DEFAULT NULL,
  `expires_at` datetime(3) DEFAULT NULL,
  `consumed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`,`model`),
  KEY `IDX_7306a56561b135bedaf65f8874` (`grant_id`),
  KEY `IDX_87b1d906e2ff6b6ceea9684254` (`user_code`),
  KEY `IDX_057f263a02526a21a3714216df` (`uid`),
  KEY `IDX_077077506d29bc909ae911d919` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `organization`
--

DROP TABLE IF EXISTS `organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `parent_id` char(26) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'company',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `sort` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_aa6e74e96ed2dddfcf09782110` (`code`),
  KEY `IDX_15acafd6698ac846c6b6a6a50e` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parameter`
--

DROP TABLE IF EXISTS `parameter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parameter` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `param_key` varchar(100) NOT NULL,
  `param_value` text,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_931a6575f7efe4d62edad3b0a7` (`param_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permission`
--

DROP TABLE IF EXISTS `permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permission` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `application_id` char(26) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(100) NOT NULL,
  `resource` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permission_app_code` (`application_id`,`code`),
  KEY `IDX_a54f03e458b32ac6811fee6332` (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `policy`
--

DROP TABLE IF EXISTS `policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `effect` varchar(10) NOT NULL DEFAULT 'allow',
  `subject` varchar(100) NOT NULL,
  `action` varchar(100) NOT NULL,
  `conditions` json DEFAULT NULL,
  `role_id` char(26) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_6492108b1b6de91c72c0145662` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `position`
--

DROP TABLE IF EXISTS `position`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `position` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `organization_id` char(26) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `level` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_4e7ff4b54fba3f71f8d435eec8` (`organization_id`),
  KEY `IDX_01e858cf7d6aa6b8f738b14997` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `profile`
--

DROP TABLE IF EXISTS `profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `gender` varchar(10) NOT NULL DEFAULT 'unknown',
  `birthday` date DEFAULT NULL,
  `language` varchar(10) NOT NULL DEFAULT 'zh-CN',
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
  `bio` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_d752442f45f258a8bdefeebb2f` (`user_id`),
  UNIQUE KEY `REL_d752442f45f258a8bdefeebb2f` (`user_id`),
  CONSTRAINT `FK_d752442f45f258a8bdefeebb2f2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rate_limit_rule`
--

DROP TABLE IF EXISTS `rate_limit_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limit_rule` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `target_type` varchar(20) NOT NULL,
  `target_pattern` varchar(200) NOT NULL,
  `window_seconds` int NOT NULL,
  `max_requests` int NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resource`
--

DROP TABLE IF EXISTS `resource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` varchar(30) DEFAULT NULL,
  `attributes` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_6a30ce5442c65e640d87dfa8d5` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `application_id` char(26) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'custom',
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_app_code` (`application_id`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_menu`
--

DROP TABLE IF EXISTS `role_menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_menu` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `role_id` char(26) NOT NULL,
  `menu_id` char(26) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_menu` (`role_id`,`menu_id`),
  KEY `IDX_25f45e543fbda0c91da4af7a2a` (`role_id`),
  KEY `IDX_96d26921e6aa2172256a55a6bc` (`menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_permission`
--

DROP TABLE IF EXISTS `role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permission` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `role_id` char(26) NOT NULL,
  `permission_id` char(26) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_permission` (`role_id`,`permission_id`),
  KEY `IDX_3d0a7155eafd75ddba5a701336` (`role_id`),
  KEY `IDX_e3a3ba47b7ca00fd23be4ebd6c` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `scheduled_job`
--

DROP TABLE IF EXISTS `scheduled_job`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduled_job` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `cron` varchar(100) NOT NULL,
  `handler` varchar(200) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'enabled',
  `last_run_at` datetime(3) DEFAULT NULL,
  `next_run_at` datetime(3) DEFAULT NULL,
  `last_result` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e9fa2da896f3bb1da2821312e4` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session`
--

DROP TABLE IF EXISTS `session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `device_id` char(26) DEFAULT NULL,
  `kind` varchar(30) NOT NULL DEFAULT 'portal_password',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_232f8e85d7633bd6ddfad42169` (`token`),
  KEY `IDX_30e98e8746699fb9af235410af` (`user_id`),
  KEY `IDX_2223e981900a413ce4ce6386f9` (`expires_at`),
  KEY `FK_0439eebad5445f7def6a9dd50d7` (`device_id`),
  CONSTRAINT `FK_0439eebad5445f7def6a9dd50d7` FOREIGN KEY (`device_id`) REFERENCES `device` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_30e98e8746699fb9af235410aff` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_config`
--

DROP TABLE IF EXISTS `system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_config` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` text,
  `config_group` varchar(50) DEFAULT NULL,
  `value_type` varchar(20) NOT NULL DEFAULT 'string',
  `description` varchar(500) DEFAULT NULL,
  `is_public` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_c54d4e3d5a246ef29601e48d75` (`config_key`),
  KEY `IDX_627c8fe85813a56fcb5089b5d0` (`config_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `organization_id` char(26) NOT NULL,
  `name` varchar(200) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_b71618cf6c9cf1d30ff71b0320` (`organization_id`),
  KEY `IDX_b5aa1ec412d4465ec20d475c6a` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_member`
--

DROP TABLE IF EXISTS `team_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_member` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `team_id` char(26) NOT NULL,
  `employee_id` char(26) NOT NULL,
  `role_in_team` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team_member` (`team_id`,`employee_id`),
  KEY `IDX_a1b5b4f5fa1b7f890d0a278748` (`team_id`),
  KEY `IDX_86100f8eaf5a85d97da6b5cba2` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `token`
--

DROP TABLE IF EXISTS `token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `token` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) NOT NULL,
  `client_id` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL,
  `token_ref` varchar(255) NOT NULL,
  `scopes` json DEFAULT NULL,
  `expires_at` datetime(3) NOT NULL,
  `revoked` tinyint NOT NULL DEFAULT '0',
  `revoked_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8e00c7be71d76b35f2d083c156` (`token_ref`),
  KEY `IDX_e50ca89d635960fda2ffeb1763` (`user_id`),
  KEY `IDX_5034edd739fb0be550e863b674` (`client_id`),
  KEY `IDX_19e324efdf732e6abfba15473d` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `upload_chunk`
--

DROP TABLE IF EXISTS `upload_chunk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `upload_chunk` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `upload_id` varchar(100) NOT NULL,
  `file_hash` varchar(64) NOT NULL,
  `chunk_index` int NOT NULL,
  `chunk_size` int NOT NULL,
  `total_chunks` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'uploaded',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_upload_chunk` (`upload_id`,`chunk_index`),
  KEY `IDX_2074017e9321580adc0f4ea96f` (`upload_id`),
  KEY `IDX_7a88e657594acec96a5a293c5b` (`file_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `email_verified` tinyint NOT NULL DEFAULT '0',
  `phone` varchar(32) DEFAULT NULL,
  `phone_verified` tinyint NOT NULL DEFAULT '0',
  `name` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `is_system` tinyint NOT NULL DEFAULT '0',
  `last_login_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`),
  UNIQUE KEY `IDX_8e1f623798118e629b46a9e629` (`phone`),
  KEY `IDX_3d44ccf43b8a0d6b9978affb88` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_role`
--

DROP TABLE IF EXISTS `user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_role` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` char(26) NOT NULL,
  `role_id` char(26) NOT NULL,
  `application_id` char(26) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_role` (`user_id`,`role_id`,`application_id`),
  KEY `IDX_d0e5815877f7395a198a4cb0a4` (`user_id`),
  KEY `IDX_32a6fc2fcb019d8e3a8ace0f55` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `verification`
--

DROP TABLE IF EXISTS `verification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `identifier` varchar(255) NOT NULL,
  `value` varchar(255) NOT NULL,
  `type` varchar(30) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `consumed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_896e5902333fa9991d1733e5ee` (`identifier`),
  KEY `IDX_a3158a931b46cbb4ca60a16fd7` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `webhook_endpoint`
--

DROP TABLE IF EXISTS `webhook_endpoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_endpoint` (
  `id` char(26) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `url` varchar(500) NOT NULL,
  `events` json NOT NULL,
  `secret` varchar(255) DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'iam'
--

--
-- Dumping routines for database 'iam'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-05  4:29:15
