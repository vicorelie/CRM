<?php
/**
 * Database.php - Classe de connexion sécurisée à la base de données
 * Utilise PDO avec prepared statements pour prévenir les injections SQL
 */

class Database {
    private $host;
    private $dbname;
    private $username;
    private $password;
    private $conn;
    private $stmt;
    private $error;

    /**
     * Constructeur - Initialise la connexion à la base de données
     *
     * @param string $host Hôte de la base de données
     * @param string $dbname Nom de la base de données
     * @param string $username Nom d'utilisateur
     * @param string $password Mot de passe
     */
    public function __construct($host, $dbname, $username, $password) {
        $this->host = $host;
        $this->dbname = $dbname;
        $this->username = $username;
        $this->password = $password;

        // Connexion à la base de données
        $this->connect();
    }

    /**
     * Établit la connexion à la base de données
     */
    private function connect() {
        $dsn = 'mysql:host=' . $this->host . ';dbname=' . $this->dbname . ';charset=utf8mb4';

        $options = array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        );

        try {
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            error_log("Database Connection Error: " . $this->error);
            throw new Exception("Impossible de se connecter à la base de données");
        }
    }

    /**
     * Prépare une requête SQL
     *
     * @param string $sql Requête SQL avec placeholders
     */
    public function query($sql) {
        try {
            $this->stmt = $this->conn->prepare($sql);
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            error_log("Query Preparation Error: " . $this->error);
            throw new Exception("Erreur lors de la préparation de la requête");
        }
    }

    /**
     * Bind une valeur à un paramètre
     *
     * @param int|string $param Position ou nom du paramètre
     * @param mixed $value Valeur à binder
     * @param int $type Type PDO du paramètre
     */
    public function bind($param, $value, $type = null) {
        if (is_null($type)) {
            switch (true) {
                case is_int($value):
                    $type = PDO::PARAM_INT;
                    break;
                case is_bool($value):
                    $type = PDO::PARAM_BOOL;
                    break;
                case is_null($value):
                    $type = PDO::PARAM_NULL;
                    break;
                default:
                    $type = PDO::PARAM_STR;
            }
        }

        try {
            $this->stmt->bindValue($param, $value, $type);
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            error_log("Bind Error: " . $this->error);
            throw new Exception("Erreur lors du binding des paramètres");
        }
    }

    /**
     * Exécute la requête préparée
     *
     * @return bool True si succès, False sinon
     */
    public function execute() {
        try {
            return $this->stmt->execute();
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            error_log("Execute Error: " . $this->error . " | Query: " . $this->stmt->queryString);
            return false;
        }
    }

    /**
     * Retourne plusieurs résultats
     *
     * @return array Tableau associatif des résultats
     */
    public function resultSet() {
        $this->execute();
        return $this->stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retourne un seul résultat
     *
     * @return mixed Résultat unique
     */
    public function single() {
        $this->execute();
        return $this->stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Retourne le nombre de lignes affectées
     *
     * @return int Nombre de lignes
     */
    public function rowCount() {
        return $this->stmt->rowCount();
    }

    /**
     * Retourne le dernier ID inséré
     *
     * @return string Dernier ID
     */
    public function lastInsertId() {
        return $this->conn->lastInsertId();
    }

    /**
     * Commence une transaction
     *
     * @return bool True si succès
     */
    public function beginTransaction() {
        return $this->conn->beginTransaction();
    }

    /**
     * Valide une transaction
     *
     * @return bool True si succès
     */
    public function commit() {
        return $this->conn->commit();
    }

    /**
     * Annule une transaction
     *
     * @return bool True si succès
     */
    public function rollBack() {
        return $this->conn->rollBack();
    }

    /**
     * Retourne la dernière erreur
     *
     * @return string Message d'erreur
     */
    public function getError() {
        return $this->error;
    }

    /**
     * Ferme la connexion
     */
    public function closeConnection() {
        $this->conn = null;
    }
}
